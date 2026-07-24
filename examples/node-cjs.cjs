// CommonJS usage. Run: node examples/node-cjs.cjs
const { createQuranClient } = require('quran-api-unified')

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

async function main() {
  const client = createQuranClient({ fetch })
  const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
  if (res.ok) {
    console.log('source:', res.value.text?.source)
    console.log('text:  ', res.value.text?.value?.text)
  } else {
    console.error('failed:', res.error.code, res.error.message)
  }
}

main()
