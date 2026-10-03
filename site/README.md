# Public site

The pages the app links to: the Privacy Policy, the Terms of Service, and the
password-reset hand-off page. These files are the source of truth; the live
copy is the public GitHub repo `TyrekeYazzie/fitnessapp-site` (GitHub Pages,
deploy from the `main` branch root), served at
https://tyrekeyazzie.github.io/fitnessapp-site/.

To publish a change, copy everything in this folder into that repo and push.
GitHub Pages renders the `.md` files with Jekyll; `reset-password.html` is
served as-is.

If the address changes, update `SITE_URL` in `src/constants/links.ts` and the
Supabase Redirect URLs allow-list.
