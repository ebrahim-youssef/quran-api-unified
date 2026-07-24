---
'quran-api-unified': minor
---

Add credentialed providers and the Quran Foundation OAuth2 adapter (#12).

The client now performs the OAuth2 **client-credentials** grant for adapters whose `auth` is
`'oauth2-client'`: it exchanges the caller's `clientId`/`secret` at the adapter's `tokenUrl`
for an access token, caches it per client (respecting `expires_in`), and injects it as
`ctx.accessToken` for the adapter's `headers` to attach. A caller may instead supply a ready
`accessToken`. The new `quran_foundation` adapter (official Quran.com v4) uses this; without
credentials it is skipped in auto-selection and throws only if named explicitly.

Also extends the HTTP leaf with `method`/`body` (for the token request) and exports the
`OAuth2ClientConfig` port type.
