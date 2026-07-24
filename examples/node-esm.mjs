// ESM usage. Run: node examples/node-esm.mjs
// Uses the real built package via a self-reference to `quran-api-unified`.
// Swap the injected `fetch` for the runtime default to hit live providers.
import { createQuranClient } from 'quran-api-unified'

// A tiny fake so the example is deterministic and offline. Delete `fetch` to go live.
const fetch = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        data: {
          number: 1,
          text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          numberInSurah: 1,
          surah: { number: 1 },
        },
      }),
      { status: 200 },
    ),
  )

const client = createQuranClient({ fetch })
const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })

if (res.ok) {
  console.log('source:', res.value.text?.source)
  console.log('text:  ', res.value.text?.value?.text)
} else {
  console.error('failed:', res.error.code, res.error.message)
}
