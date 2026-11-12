# Cottonco.wear catalogue

Static website (no server, no database, no admin login). Daily wear for women only.

Files
- `index.html`, `style.css`, `app.js`: the site
- `products.json`: ALL products and shop settings (edit this)
- `images/`: product photos (JPG/WebP, about 800x1000 px, under 300 KB each)
- `assets/logo.jpg`: the real logo (hero). `assets/hero.jpg` is a web-sized copy, `assets/favicon.png` the tab icon
- `fonts/`: self-hosted Cormorant Garamond + Jost

## Set WhatsApp and Instagram
Open `products.json`, edit the `shop` block:
```
"whatsapp": "919876543210",   // country code + number, digits only
"instagram": "cottonco.wear"  // handle only
```
Each product's "Enquire on WhatsApp" button then opens a chat with the product name filled in. Until a number is set the buttons just show "opens soon".

## Add or change a product
1. Put the photo in `images/` (e.g. `images/rose-kurti.jpg`).
2. Add an entry to `products` in `products.json`:
```
{ "id": "rose-kurti", "category": "kurtis", "name": "Rose Cotton Kurti",
  "description": "Soft cotton, straight cut.", "price": 799,
  "sizes": ["S","M","L","XL"], "image": "rose-kurti.jpg" }
```
- `category` must be one of: `kurtis`, `cotton-tops`, `co-ord-sets`, `loungewear`, `dupattas` (add more in `categories`).
- `price`: number (shown with the currency symbol) or `null` for "Price on enquiry".
- Leave out `"sample": true` for real products (it shows the "Sample" badge). Delete the sample entries once real ones are in.
- `image` is the file name inside `images/`. Leave `""` for the placeholder tile.
3. Re-deploy (see below). Keep the JSON valid (commas, quotes).

## Deploy
The live copy is a copy of this folder. To update, re-upload the whole folder to the same host (see `DEPLOY.txt`).
