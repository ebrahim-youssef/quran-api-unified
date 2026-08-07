/**
 * Canonical identity and provenance primitives (ADR-0013, ADR-0014). Pure types only — this
 * module imports nothing and must never import `core/http.ts` or anything that performs I/O,
 * same discipline as `core/schema.ts`.
 */

/** A bilingual display name: Arabic and English, both required (ADR-0013). */
export interface LocalizedName {
  readonly ar: string
  readonly en: string
}

/**
 * A compact reference to a canonical registry resource: its stable id (ADR-0013) plus its
 * bilingual name. Used for domain resources presented to end users (reciters, translation
 * works, scripts, transmissions, ...) — not for adapter/provider identity, which stays a
 * plain `{ id, name }` pair on {@link Provenance.provider} since providers are an internal
 * implementation detail, not a Quranic resource needing bilingual naming.
 */
export interface ResourceRef {
  readonly id: string
  readonly name: LocalizedName
}

/**
 * Where a successful {@link Outcome}'s value came from (ADR-0014). Lives on `Outcome`, never
 * on the `Unified*` value itself — the same split an HTTP response draws between headers and
 * body. `sourceUrl` and `retrievedAt` are captured by the client at fetch time; `sourceVersion`
 * and `providerResourceId` are populated only when an adapter's `CapabilityHandler` supplies
 * the matching optional pure extractor — never guessed.
 */
export interface Provenance {
  /** The adapter that served this outcome: its stable id and English display name. */
  readonly provider: { readonly id: string; readonly name: string }
  /** The provider's own identifier for this specific resource, when the adapter exposes one. */
  readonly providerResourceId?: string
  /** The exact URL requested for this attempt. */
  readonly sourceUrl?: string
  /** A version/revision marker the provider's response itself exposed, when trustworthy. */
  readonly sourceVersion?: string
  /** ISO-8601 timestamp of when the response was received. */
  readonly retrievedAt: string
}
