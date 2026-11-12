(function () {
  "use strict";
  var state = { data: null, cat: "all" };
  var $ = function (s) { return document.querySelector(s); };

  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function waLink(text) {
    var n = digits(state.data.shop.whatsapp);
    return n ? "https://wa.me/" + n + "?text=" + encodeURIComponent(text) : "";
  }
  function igLink() {
    var h = String(state.data.shop.instagram || "").trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[\/?#].*$/, "");
    return /^[A-Za-z0-9._]+$/.test(h) ? "https://instagram.com/" + h : "";
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function catName(id) {
    var c = state.data.categories.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : "";
  }
  function price(p) {
    return typeof p.price === "number" ? state.data.shop.currency + p.price.toLocaleString("en-IN") : "Price on enquiry";
  }
  function card(p) {
    var c = el("article", "card");
    var pic = el("div", "pic");
    if (p.image) {
      var img = el("img"); img.src = "images/" + encodeURIComponent(p.image).replace(/%2F/g, "/");
      img.alt = p.name; img.loading = "lazy"; img.width = 400; img.height = 500;
      pic.appendChild(img);
    } else {
      var ph = el("div", "ph", "C&C"); ph.appendChild(el("small", null, "Photo coming soon")); pic.appendChild(ph);
    }
    if (p.soldOut) { pic.classList.add("soldout"); pic.appendChild(el("span", "badge sold", "Sold out")); }
    else if (p.sample) pic.appendChild(el("span", "badge", "Sample"));
    c.appendChild(pic);
    var info = el("div", "info");
    info.appendChild(el("div", "cat", catName(p.category)));
    info.appendChild(el("h3", null, p.name));
    if (p.description) info.appendChild(el("p", "desc", p.description));
    info.appendChild(el("div", "price", price(p)));
    if (p.sizes && p.sizes.length) info.appendChild(el("div", "sizes", "Sizes: " + p.sizes.join(", ")));
    if (p.soldOut) { var so = el("span", "btn sold-btn", "Sold out"); so.setAttribute("aria-disabled", "true"); info.appendChild(so); c.appendChild(info); return c; }
    var a = el("a", "btn wa", "Enquire on WhatsApp");
    a.href = "#contact"; a.setAttribute("data-wa", ""); a.setAttribute("data-msg", "Hi Cottonco.wear, I'm interested in: " + p.name + (p.sample ? " (sample design)" : ""));
    info.appendChild(a);
    c.appendChild(info);
    return c;
  }
  function render() {
    var grid = $("#grid"); grid.textContent = "";
    var list = state.data.products.filter(function (p) { return state.cat === "all" || p.category === state.cat; });
    if (!list.length) grid.appendChild(el("p", "empty", "New designs coming soon in this category."));
    list.forEach(function (p) { grid.appendChild(card(p)); });
    Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (b) {
      b.setAttribute("aria-selected", String(b.dataset.cat === state.cat));
    });
  }
  function chips() {
    var box = $("#chips");
    [{ id: "all", name: "All" }].concat(state.data.categories).forEach(function (c) {
      var b = el("button", "chip", c.name); b.type = "button"; b.dataset.cat = c.id; b.setAttribute("role", "tab");
      b.addEventListener("click", function () { state.cat = c.id; render(); });
      box.appendChild(b);
    });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-wa],a[data-ig]");
    if (!a || !state.data) return;
    var url = a.hasAttribute("data-wa") ? waLink(a.getAttribute("data-msg") || "Hi Cottonco.wear, I'd like to know more about your collection.") : igLink();
    if (url) { e.preventDefault(); window.open(url, "_blank", "noopener"); }
    else if (a.getAttribute("href") === "#") { e.preventDefault(); toast(a.hasAttribute("data-wa") ? "WhatsApp ordering opens soon." : "Our Instagram page opens soon."); }
    else if (a.hasAttribute("data-wa")) { /* falls through to #contact */ }
  });
  document.getElementById("yr").textContent = new Date().getFullYear();
  fetch("products.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    state.data = d; d.products = d.products || [];
    var hasSample = d.products.some(function (p) { return p.sample; });
    var note = $("#shop-note"); if (note) note.hidden = !hasSample;
    chips(); render();
  }).catch(function () {
    $("#grid").appendChild(el("p", "empty", "The collection could not load. Please refresh, or message us."));
  });
})();
