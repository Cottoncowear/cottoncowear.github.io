# Cottonco.wear: get your access token (one time, on your phone)

Your owner page: https://cottoncowear.github.io/admin.html
(Don't share this page link. Only you can use it, and only with your token.)

## Create the token
1. Open this link while signed in to your Cottoncowear GitHub account:
   **https://github.com/settings/personal-access-tokens/new**
   (Or: github.com → your profile picture → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.)
2. **Token name:** `Cottonco admin`
3. **Expiration:** pick **1 year**. (Choosing "No expiration" is easier, but if your phone is ever lost, the token keeps working until you delete it. You can delete it any time on the same page.)
4. **Repository access:** tap **Only select repositories** → choose **cottoncowear.github.io**.
5. **Permissions:** tap **Add permissions** → **Contents** → set to **Read and write**. Leave everything else off.
6. Tap **Generate token**, then **copy** the token (starts with `github_pat_`). GitHub shows it only once.
7. Open https://cottoncowear.github.io/admin.html, paste the token, tap **Save & continue**.

## Using it
- **Add product:** choose photo, type name, price, pick category and sizes, tap **Upload**.
- **My products:** edit, mark sold out, or delete.
- **Shop details:** add your WhatsApp number (e.g. `919876543210`) and Instagram name; tick the box to remove the sample designs.
- Changes show on the website about 1 minute later.
- Tap **Sign out** when you are on someone else's phone. The token is stored only in this phone's browser.
