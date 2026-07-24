// Typed usage. Run: npx tsx examples/typescript.ts (or compile with tsc).
// Shows the typed result union, per-concern parts, and the opt-in raw passthrough.
import { createQuranClient, type GetResult, type UnifiedVerse } from 'quran-api-unified'

const fetch: typeof globalThis.fetch = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        data: {
          number: 1,
          text: 'بِسْمِ اللَّهِ',
          numberInSurah: 1,
          juz: 1,
          page: 1,
          surah: { number: 1 },
        },
      }),
      { status: 200 },
    ),
  )

const client = createQuranClient({ fetch })

const res: GetResult = await client.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  includeRaw: true, // also return the provider's original body on Part.raw
})

if (res.ok) {
  const verse: UnifiedVerse | undefined = res.value.text?.value
  console.log('unified:', verse?.text)
  console.log('raw    :', res.value.text?.raw) // the non-unified provider response
} else {
  console.error(res.error.code)
}
