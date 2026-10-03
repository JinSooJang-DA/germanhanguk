# Member moderation and six-month re-registration block

Apply `20261004000000_member_moderation_and_withdrawal_rejoin_block.sql` to a staging project first.

Before applying it, create a long random secret named `withdrawal_rejoin_hmac_key` in **Supabase Dashboard → Database → Vault**. Do not place this value in source control or in a browser environment variable.

After applying the migration, enable the **Before User Created** Auth Hook in **Authentication → Hooks** and point it at:

`pg-functions://postgres/public/hook_block_recently_withdrawn_email`

The hook prevents creation of a new Auth user for an email whose previous account was withdrawn less than six months ago. The database stores only an HMAC of the normalized email and its expiry, never the email itself.

The Vercel daily cron at 03:20 UTC removes expired HMAC records. Keep `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel; neither is exposed to browsers.

The moderation API requires `SUPABASE_SERVICE_ROLE_KEY` only on the server. It is used to apply the matching Supabase Auth ban after the requesting administrator has been authenticated and authorized.

Run the SQL test suite in a disposable/staging Supabase project before production. Verify: email signup after withdrawal is rejected for six months; Google sign-in carrying the same email is rejected; a seven-day, thirty-day, permanent ban and restore are reflected in Auth and in Data API access; normal members cannot invoke moderation RPCs; administrators cannot moderate themselves or other administrators.
