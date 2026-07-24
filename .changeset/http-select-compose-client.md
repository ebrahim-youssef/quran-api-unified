---
'quran-api-unified': minor
---

Add the client factory, provider selection, and composition — the working `get()` API
(tickets #4, #5, #6).

`createQuranClient(options)` returns `{ get, listAdapters, registerAdapter }`. `get()` fans
the requested concerns out in parallel, each with its own ordered preference and
fallback-on-error chain (ADR-0004), and returns partial results as data (ADR-0003): a failed
concern carries its aggregate error plus a per-provider attempt trail without failing the
others. Provider/network failures never throw; only misuse does — an empty `include`, or an
explicitly named source that is unknown, non-serving, or missing credentials. Credentialed
adapters are skipped in auto-selection until their credentials are supplied. The `Adapter`
port and `builtinAdapters` registry are exported so consumers can register custom providers,
including into the fallback chain.
