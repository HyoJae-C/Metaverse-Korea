# Custom domain and Google sign-in

The site is built by `.github/workflows/deploy.yml` and served by GitHub Pages.
Google sign-in goes through Supabase Auth (`src/core/cloud-save.js`), so Google
only ever redirects back to Supabase, never to the site directly.

## 1. Point the domain at GitHub Pages

At the registrar's DNS settings (e.g. Gabia → DNS 설정):

| Type  | Host  | Value                 |
| ----- | ----- | --------------------- |
| A     | `@`   | `185.199.108.153`     |
| A     | `@`   | `185.199.109.153`     |
| A     | `@`   | `185.199.110.153`     |
| A     | `@`   | `185.199.111.153`     |
| CNAME | `www` | `hyojae-c.github.io.` |

Then in GitHub:

1. Repository → Settings → Pages → Custom domain: enter the bare domain
   (no `www`) and Save. GitHub serves `www.` and redirects it to the bare domain.
2. Wait for the DNS check to pass, then tick **Enforce HTTPS** (the certificate
   can take up to an hour).
3. Recommended: account Settings → Pages → Add a verified domain, so nobody
   else can claim the domain on GitHub.

The old `hyojae-c.github.io/Metaverse-Korea/` address redirects to the new one.

In the repo, set `VITE_SITE_URL` in `.env` to `https://metaverseseoul.co.kr/` (used for
link previews) and keep `public/CNAME` holding the same bare domain.

## 2. Google Cloud (OAuth client and consent screen)

APIs & Services → Credentials → the Web OAuth client:

- Authorized JavaScript origins: `https://metaverseseoul.co.kr` (keep `https://hyojae-c.github.io`
  while the old address is still in use)
- Authorized redirect URIs: `https://qiefmpxiiercqfazigjv.supabase.co/auth/v1/callback`
  (unchanged by the domain move)

OAuth consent screen (Branding):

- Home page: `https://metaverseseoul.co.kr/`
- Privacy policy: `https://metaverseseoul.co.kr/privacy.html`
- Terms of service: `https://metaverseseoul.co.kr/terms.html`
- Authorized domains: `metaverseseoul.co.kr` and `supabase.co`

While the app is in "Testing", only listed test users can sign in. Publish it
to let everyone in (a logo upload triggers Google's brand review).

## 3. Supabase

Authentication → Sign In / Providers → Google: paste the OAuth **client ID**
(ends in `.apps.googleusercontent.com`) and client secret, turn on
**Enable Sign in with Google**, Save.

Authentication → URL Configuration:

- Site URL: `https://metaverseseoul.co.kr/`
- Redirect URLs: `https://metaverseseoul.co.kr/**` (and `https://hyojae-c.github.io/**`
  during the move, plus `http://localhost:5173/**` for development)

Also keep **Allow anonymous sign-ins** on: guests link Google to their account.

## 4. Check

Open the site → Settings → "Link Google account". You should see Google's
account picker, come back to the game, and Settings should say the save is on
your account.
