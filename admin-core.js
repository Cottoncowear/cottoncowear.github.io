/* Cottonco.wear admin: GitHub contents API helpers (no UI). Works in browser and Node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CWCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var CATEGORIES = [
    { id: "kurtis", name: "Kurtis" },
    { id: "cotton-tops", name: "Cotton Tops" },
    { id: "co-ord-sets", name: "Co-ord Sets" },
    { id: "loungewear", name: "Loungewear & Nightwear" },
    { id: "dupattas", name: "Dupattas" }
  ];

  function bytesToB64(bytes) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s);
  }
  function textToB64(text) { return bytesToB64(new TextEncoder().encode(text)); }
  function b64ToText(b64) {
    var bin = atob(String(b64).replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function slugify(s) {
    var t = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/, "");
    return t || "item";
  }
  function cleanWhatsApp(v) { return String(v || "").replace(/\D/g, ""); }
  function cleanInstagram(v) {
    return String(v || "").trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/[\/?#].*$/, "");
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function GhError(status, message, conflict) {
    var e = new Error(message); e.status = status; e.conflict = !!conflict; return e;
  }
  function friendly(status, apiMsg) {
    if (status === 401) return "GitHub did not accept this token. It may be wrong or expired. Please sign out and paste a new token.";
    if (status === 403) return "This token is not allowed to do that (or GitHub is rate-limiting). Check the token has 'Contents: Read and write' for this repo only. " + (apiMsg || "");
    if (status === 404) return "Could not find the website files. The token may not have access to this repository.";
    if (status === 409 || status === 422) return "The website was changed at the same time. Please try again.";
    return "GitHub error " + status + ": " + (apiMsg || "unknown");
  }

  function createClient(opts) {
    var owner = opts.owner, repo = opts.repo, token = opts.token;
    var f = opts.fetch || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : null);
    var base = (opts.apiBase || "https://api.github.com") + "/repos/" + owner + "/" + repo;

    async function req(method, path, body) {
      var res;
      try {
        res = await f(base + path + (method === "GET" ? (path.indexOf("?") < 0 ? "?" : "&") + "_=" + Date.now() : ""), {
          method: method,
          cache: "no-store",
          headers: Object.assign({
            "Authorization": "Bearer " + token,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
          }, body ? { "Content-Type": "application/json" } : {}),
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (e) {
        throw GhError(0, "No internet connection, or GitHub could not be reached. Please check and try again.");
      }
      var json = null;
      try { json = await res.json(); } catch (e) { /* empty */ }
      if (!res.ok) {
        var msg = json && json.message ? json.message : "";
        var conflict = res.status === 409 || (res.status === 422 && /sha|does not match/i.test(msg));
        throw GhError(res.status, friendly(res.status, msg), conflict);
      }
      return json;
    }

    function enc(p) { return p.split("/").map(encodeURIComponent).join("/"); }

    var api = {
      checkAccess: async function () {
        var r = await req("GET", "");
        if (r.permissions && r.permissions.push === false) throw GhError(403, "This token can only read. Please create it with 'Contents: Read and write'.");
        return r;
      },
      getFile: async function (path) {
        var r = await req("GET", "/contents/" + enc(path));
        return { sha: r.sha, text: b64ToText(r.content) };
      },
      putFile: function (path, contentB64, message, sha) {
        var body = { message: message, content: contentB64 };
        if (sha) body.sha = sha;
        return req("PUT", "/contents/" + enc(path), body);
      },
      deleteFile: async function (path, message) {
        var r = await req("GET", "/contents/" + enc(path));
        return req("DELETE", "/contents/" + enc(path), { message: message, sha: r.sha });
      },
      /* Read products.json fresh, apply mutator(data), write back. One retry on conflict. */
      updateData: async function (mutator, message) {
        var lastErr;
        for (var attempt = 0; attempt < 2; attempt++) {
          var file = await api.getFile("products.json");
          var data = JSON.parse(file.text);
          var out = mutator(clone(data));
          if (out === false) return data;
          try {
            await api.putFile("products.json", textToB64(JSON.stringify(out, null, 2) + "\n"), message, file.sha);
            return out;
          } catch (e) { lastErr = e; if (!e.conflict) throw e; }
        }
        throw lastErr;
      },
      load: async function () { return JSON.parse((await api.getFile("products.json")).text); },

      addProduct: async function (p) {
        /* p: {imageB64, name, price, sizes, category, description} */
        var id = "p-" + Date.now();
        var image = slugify(p.name) + "-" + Date.now() + ".jpg";
        await api.putFile("images/" + image, p.imageB64, "Add photo: " + p.name);
        var entry = { id: id, category: p.category, name: p.name, description: p.description || "", price: p.price, sizes: p.sizes || [], image: image };
        try {
          await api.updateData(function (d) { d.products.unshift(entry); return d; }, "Add product: " + p.name);
        } catch (e) {
          try { await api.deleteFile("images/" + image, "Remove unused photo"); } catch (e2) { /* ignore */ }
          throw e;
        }
        return entry;
      },
      editProduct: async function (id, fields, newImageB64) {
        var newImage = null, oldImage = null;
        if (newImageB64) {
          newImage = slugify(fields.name) + "-" + Date.now() + ".jpg";
          await api.putFile("images/" + newImage, newImageB64, "Replace photo: " + fields.name);
        }
        try {
          await api.updateData(function (d) {
            var p = d.products.filter(function (x) { return x.id === id; })[0];
            if (!p) throw GhError(404, "That product no longer exists.");
            ["name", "price", "sizes", "category", "description"].forEach(function (k) { if (k in fields) p[k] = fields[k]; });
            if (newImage) { oldImage = p.image; p.image = newImage; }
            return d;
          }, "Edit product: " + fields.name);
        } catch (e) {
          if (newImage) { try { await api.deleteFile("images/" + newImage, "Remove unused photo"); } catch (e2) {} }
          throw e;
        }
        if (oldImage) { try { await api.deleteFile("images/" + oldImage, "Remove old photo"); } catch (e) {} }
      },
      setSoldOut: function (id, soldOut) {
        return api.updateData(function (d) {
          var p = d.products.filter(function (x) { return x.id === id; })[0];
          if (!p) throw GhError(404, "That product no longer exists.");
          if (soldOut) p.soldOut = true; else delete p.soldOut;
          return d;
        }, (soldOut ? "Mark sold out: " : "Mark available: ") + id);
      },
      deleteProduct: async function (id) {
        var image = null;
        await api.updateData(function (d) {
          var p = d.products.filter(function (x) { return x.id === id; })[0];
          if (!p) throw GhError(404, "That product no longer exists.");
          image = p.image;
          d.products = d.products.filter(function (x) { return x.id !== id; });
          return d;
        }, "Delete product: " + id);
        if (image) { try { await api.deleteFile("images/" + image, "Remove photo of deleted product"); } catch (e) {} }
      },
      saveShop: function (s) {
        return api.updateData(function (d) {
          d.shop = d.shop || {};
          d.shop.whatsapp = cleanWhatsApp(s.whatsapp);
          d.shop.instagram = cleanInstagram(s.instagram);
          if (s.removeSamples) d.products = d.products.filter(function (p) { return !p.sample; });
          return d;
        }, "Update shop details");
      }
    };
    return api;
  }

  return { CATEGORIES: CATEGORIES, createClient: createClient, slugify: slugify, cleanWhatsApp: cleanWhatsApp, cleanInstagram: cleanInstagram, textToB64: textToB64, b64ToText: b64ToText, bytesToB64: bytesToB64 };
});
