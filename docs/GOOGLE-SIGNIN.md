# Google sign-in

Supabase handles the OAuth (PKCE) exchange; the app adds a button and uses the
existing `/auth/callback` route. No new env vars.

## Flow

1. `GoogleButton` (`app/auth/google-button.tsx`) calls `signInWithOAuth({ provider: "google" })`
   with `redirectTo = <origin>/auth/callback?next=/onboarding[?next=<dest>]`.
2. Google → Supabase → back to `/auth/callback?code=…`.
3. The callback trades the code for a session (cookies), then redirects to `next`
   (same-site paths only). Provider errors/cancels return to `/login?error=oauth`.
4. `/onboarding` asks new writers for a handle (display name prefilled from Google)
   and forwards returning writers straight to their page or `dest`.

The same button is on `/login` and `/signup`; Supabase creates the account on first use.

## One-time setup (dashboards)

**Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID
(type: Web application).
- Authorized redirect URI: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
- Authorized JavaScript origins: your site origin(s), e.g. `http://localhost:3000`, `https://livingpage.one`
- OAuth consent screen (Branding): app name `Living Page`; home page `https://livingpage.one`;
  privacy `https://livingpage.one/privacy`; terms `https://livingpage.one/terms`;
  authorised domain `livingpage.one` (bare domain — not the supabase.co one). Scopes: `openid`, `email`, `profile`.
  Verify branding so the prompt shows "Living Page" instead of the Supabase domain.

**Supabase** → Authentication → Providers → Google: enable, paste Client ID + Secret.

**Supabase** → Authentication → URL Configuration:
- Site URL: your production origin.
- Redirect URLs: add `http://localhost:3000/auth/callback` and `https://<prod-origin>/auth/callback`
  (and preview-domain wildcards if you use them).

## Notes

- Same email already signed up with a password? Supabase links the Google identity to
  that account when the email is verified.
- Profiles are created in onboarding, not by a DB trigger, so nothing in `0001_init.sql` changes.
