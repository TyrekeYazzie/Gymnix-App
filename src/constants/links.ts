// Public pages served from site/ (see site/README.md for how they're published).
export const SITE_URL = 'https://tyrekeyazzie.github.io/gymnix-site';
export const PRIVACY_URL = `${SITE_URL}/privacy.html`;
export const TERMS_URL = `${SITE_URL}/terms.html`;
// Reset emails link here (https, so mail apps open it); the page hands the
// code to the app. Must be on Supabase's Redirect URLs allow-list.
export const PASSWORD_RESET_URL = `${SITE_URL}/reset-password.html`;
export const SUPPORT_EMAIL = 'ifitsupportcenter@gmail.com';
