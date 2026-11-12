(function () {
  "use strict";
  var OWNER = "Cottoncowear", REPO = "cottoncowear.github.io", KEY = "cw_admin_token";
  var SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free size"];
  var $ = function (s) { return document.querySelector(s); };
  var client = null, data = null, editing = null, photoB64 = null, busy = false;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function say(text, kind, target) {
    var m = $(target || "#msg"); m.textContent = text || ""; m.className = "msg" + (kind ? " " + kind : "");
    if (text && kind !== "err") { /* keep visible */ }
    if (text) m.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function setBusy(b, btn, label) {
    busy = b;
    Array.prototype.forEach.call(document.querySelectorAll(".panel .btn, .tab"), function (x) { x.disabled = b; });
    if (btn && label) { if (b) { btn._old = btn.textContent; btn.textContent = label; } else if (btn._old) btn.textContent = btn._old; }
  }
  function show(id) {
    ["#login"].forEach(function (s) { $(s).hidden = true; });
    $("#app").hidden = true; $(id).hidden = false;
  }

  /* ---- sign in ---- */
  function start() {
    var t = localStorage.getItem(KEY);
    $("#signout").hidden = !t;
    if (!t) { show("#login"); return; }
    client = CWCore.createClient({ owner: OWNER, repo: REPO, token: t });
    show("#app");
    initForm();
    refresh();
  }
  $("#login-btn").addEventListener("click", async function () {
    var t = $("#tok").value.trim();
    if (!t) { say("Please paste your token first.", "err", "#login-msg"); return; }
    var c = CWCore.createClient({ owner: OWNER, repo: REPO, token: t });
    setBusy(true, this, "Checking...");
    try { await c.checkAccess(); localStorage.setItem(KEY, t); $("#tok").value = ""; say("", "", "#login-msg"); start(); }
    catch (e) { say(e.message, "err", "#login-msg"); }
    setBusy(false, this, "x");
  });
  $("#signout").addEventListener("click", function () {
    localStorage.removeItem(KEY); client = null; data = null; say("", ""); start();
  });

  /* ---- tabs ---- */
  function tab(name) {
    ["add", "list", "shop"].forEach(function (n) {
      $("#tab-" + n).hidden = n !== name;
      document.querySelector('.tab[data-tab="' + n + '"]').setAttribute("aria-selected", String(n === name));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (b) {
    b.addEventListener("click", function () { say("", ""); tab(b.dataset.tab); });
  });

  /* ---- form ---- */
  function initForm() {
    if ($("#category").options.length) return;
    CWCore.CATEGORIES.forEach(function (c) { var o = el("option", null, c.name); o.value = c.id; $("#category").appendChild(o); });
    SIZES.forEach(function (s) {
      var l = el("label"), i = el("input"); i.type = "checkbox"; i.value = s; l.appendChild(i); l.appendChild(el("span", null, s));
      $("#sizes").appendChild(l);
    });
  }
  function resetForm() {
    editing = null; photoB64 = null;
    $("#pform").reset();
    $("#photo-prev").hidden = true; $("#photo-prev").removeAttribute("src");
    $("#photo-btn").textContent = "📷 Choose photo";
    $("#form-title").textContent = "Add a new product";
    $("#submit").textContent = "Upload"; $("#cancel-edit").hidden = true; $("#photo-req").hidden = false;
  }
  $("#cancel-edit").addEventListener("click", function () { resetForm(); say("", ""); });

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read this photo. Please choose a JPG or PNG photo.")); };
      img.src = url;
    });
  }
  async function compress(file) {
    var img = await loadImage(file), MAX = 1200;
    var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX / Math.max(w, h));
    var cw = Math.round(w * k), ch = Math.round(h * k);
    var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
    var ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch); ctx.drawImage(img, 0, 0, cw, ch);
    var blob = await new Promise(function (r) { cv.toBlob(r, "image/jpeg", 0.8); });
    if (!blob) throw new Error("Could not prepare the photo.");
    var bytes = new Uint8Array(await blob.arrayBuffer());
    return { b64: CWCore.bytesToB64(bytes), url: URL.createObjectURL(blob) };
  }
  $("#photo").addEventListener("change", async function () {
    var f = this.files && this.files[0]; if (!f) return;
    say("Preparing photo...", "");
    try {
      var r = await compress(f); photoB64 = r.b64;
      $("#photo-prev").src = r.url; $("#photo-prev").hidden = false; $("#photo-btn").textContent = "📷 Change photo";
      say("", "");
    } catch (e) { photoB64 = null; say(e.message, "err"); }
  });

  function readForm() {
    var name = $("#name").value.trim(), priceTxt = $("#price").value.replace(/[,\s₹]/g, "");
    if (!name) throw new Error("Please enter the product name.");
    if (!/^\d+$/.test(priceTxt) || +priceTxt <= 0) throw new Error("Please enter the price as a number, like 499.");
    var sizes = Array.prototype.map.call(document.querySelectorAll("#sizes input:checked"), function (i) { return i.value; });
    return { name: name, price: parseInt(priceTxt, 10), category: $("#category").value, sizes: sizes, description: $("#desc").value.trim() };
  }
  $("#pform").addEventListener("submit", async function (ev) {
    ev.preventDefault(); if (busy) return;
    var btn = $("#submit"), fields;
    try {
      fields = readForm();
      if (!editing && !photoB64) throw new Error("Please choose a photo first.");
    } catch (e) { say(e.message, "err"); return; }
    setBusy(true, btn, editing ? "Saving..." : "Uploading...");
    say(editing ? "Saving, please wait..." : "Uploading, please wait...", "");
    try {
      if (editing) { await client.editProduct(editing, fields, photoB64); say("✅ Saved. It will show on the website in about 1 minute.", "ok"); }
      else { await client.addProduct(Object.assign({ imageB64: photoB64 }, fields)); say("✅ Uploaded! It will show on the website in about 1 minute. You can add another one now.", "ok"); }
      resetForm(); await refresh(true);
    } catch (e) { say("❌ " + e.message, "err"); }
    setBusy(false, btn, "x");
  });

  /* ---- list ---- */
  function money(p) { return typeof p.price === "number" ? "₹" + p.price.toLocaleString("en-IN") : "No price"; }
  function catName(id) { var c = CWCore.CATEGORIES.filter(function (x) { return x.id === id; })[0]; return c ? c.name : ""; }
  function renderList() {
    var box = $("#items"); box.textContent = "";
    if (!data.products.length) { box.appendChild(el("p", "hint", "No products yet. Use 'Add product' to add your first one.")); return; }
    data.products.forEach(function (p) {
      var row = el("div", "item"), th = el("div", "th");
      if (p.image) { var im = el("img"); im.alt = ""; im.src = "images/" + encodeURIComponent(p.image); im.onerror = function () { th.textContent = "Photo shows in ~1 min"; }; th.appendChild(im); }
      else th.textContent = "No photo";
      var meta = el("div", "meta"), h = el("h3", null, p.name);
      if (p.sample) h.appendChild(el("span", "tag", "Sample"));
      if (p.soldOut) h.appendChild(el("span", "tag sold", "Sold out"));
      meta.appendChild(h);
      meta.appendChild(el("div", "sub2", money(p) + " · " + catName(p.category)));
      var acts = el("div", "acts");
      function act(label, cls, fn) { var b = el("button", "btn " + (cls || ""), label); b.type = "button"; b.addEventListener("click", fn); acts.appendChild(b); }
      act("Edit", "", function () { startEdit(p); });
      act(p.soldOut ? "Mark available" : "Mark sold out", "", function () { run(this, p.soldOut ? "Updating..." : "Updating...", function () { return client.setSoldOut(p.id, !p.soldOut); }, "Updated. Website changes in about 1 minute."); });
      act("Delete", "danger", function () {
        if (!confirm("Delete \"" + p.name + "\" from your website?")) return;
        run(this, "Deleting...", function () { return client.deleteProduct(p.id); }, "Deleted. Website changes in about 1 minute.");
      });
      meta.appendChild(acts); row.appendChild(th); row.appendChild(meta); box.appendChild(row);
    });
  }
  async function run(btn, label, fn, okMsg) {
    if (busy) return;
    setBusy(true, btn, label); say("Please wait...", "");
    try { await fn(); say("✅ " + okMsg, "ok"); await refresh(true); } catch (e) { say("❌ " + e.message, "err"); }
    setBusy(false, btn, "x");
  }
  function startEdit(p) {
    resetForm(); editing = p.id;
    $("#name").value = p.name; $("#price").value = typeof p.price === "number" ? p.price : "";
    $("#category").value = p.category; $("#desc").value = p.description || "";
    Array.prototype.forEach.call(document.querySelectorAll("#sizes input"), function (i) { i.checked = (p.sizes || []).indexOf(i.value) >= 0; });
    if (p.image) { $("#photo-prev").src = "images/" + encodeURIComponent(p.image); $("#photo-prev").hidden = false; }
    $("#photo-btn").textContent = "📷 Change photo (optional)"; $("#photo-req").hidden = true;
    $("#form-title").textContent = "Edit product"; $("#submit").textContent = "Save changes"; $("#cancel-edit").hidden = false;
    say("", ""); tab("add"); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function refresh(quiet) {
    try {
      data = await client.load(); renderList();
      $("#wa").value = (data.shop && data.shop.whatsapp) || ""; $("#ig").value = (data.shop && data.shop.instagram) || "";
    } catch (e) { say("❌ " + e.message, "err"); }
  }
  $("#reload").addEventListener("click", function () { say("", ""); refresh(); });

  /* ---- shop ---- */
  $("#save-shop").addEventListener("click", function () {
    var rm = $("#rm-samples").checked;
    if (rm && !confirm("Remove all sample designs from the website?")) return;
    run(this, "Saving...", function () { return client.saveShop({ whatsapp: $("#wa").value, instagram: $("#ig").value, removeSamples: rm }); }, "Saved. Website changes in about 1 minute.")
      .then(function () { $("#rm-samples").checked = false; });
  });

  start();
})();
