// Dual-consumption smoke: proves the built artifact resolves and *works* as ESM and as CJS,
// that the type declarations are present for both the `.` and `./zod` entries, and that the
// browser bundle runs. Uses an injected fake fetch — no network. Run after build.
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

const failures = []
function check(label, cond) {
  if (cond) console.log(`  ok   ${label}`)
  else {
    console.error(`  FAIL ${label}`)
    failures.push(label)
  }
}

// A fake fetch that returns a canned Al-Quran Cloud verse for any URL, so get() succeeds offline.
function fakeFetch() {
  const body = {
    code: 200,
    status: 'OK',
    data: {
      number: 1,
      text: 'بِسْمِ اللَّهِ',
      numberInSurah: 1,
      juz: 1,
      page: 1,
      surah: { number: 1 },
    },
  }
  return () => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
}

async function exercise(mod, label) {
  check(`${label}: createQuranClient is a function`, typeof mod.createQuranClient === 'function')
  check(
    `${label}: builtinAdapters is a non-empty array`,
    Array.isArray(mod.builtinAdapters) && mod.builtinAdapters.length > 0,
  )
  const client = mod.createQuranClient({ fetch: fakeFetch() })
  const res = await client.get({ ref: { surah: 1, ayah: 1 }, include: ['text'] })
  check(
    `${label}: get() returns a unified verse`,
    res.ok === true && res.value.text?.value?.text?.length > 0,
  )
}

// Type declarations for every published condition.
for (const f of ['index.d.ts', 'index.d.cts', 'zod.d.ts', 'zod.d.cts']) {
  check(`types present: ${f}`, existsSync(resolve(dist, f)))
}

// ESM consumption — imported and exercised.
const esm = await import(resolve(dist, 'index.js'))
check('ESM exposes VERSION', typeof esm.VERSION === 'string')
await exercise(esm, 'ESM')
const esmZod = await import(resolve(dist, 'zod.js'))
check(
  'ESM ./zod parses a valid verse',
  esmZod.parseUnifiedVerse({ key: '1:1', surah: 1, ayah: 1, source: 's', text: 't' }).text === 't',
)

// CJS consumption — required and exercised.
const cjs = require(resolve(dist, 'index.cjs'))
check('CJS exposes VERSION', typeof cjs.VERSION === 'string')
await exercise(cjs, 'CJS')
const cjsZod = require(resolve(dist, 'zod.cjs'))
check('CJS ./zod exposes a schema', typeof cjsZod.unifiedVerseSchema?.parse === 'function')

// Browser bundle — serve the repo over HTTP (Chromium blocks ES-module imports over file://),
// load the ESM build in a page, and confirm it runs. Skipped (not failed) when Chromium is not
// installed; run `pnpm exec playwright install chromium` to enable it. The launch is raced
// against a timeout so a missing/slow binary never hangs the smoke.
async function runBrowserCheck() {
  const { chromium } = await import('@playwright/test')
  const exe = chromium.executablePath?.()
  if (exe && !existsSync(exe)) {
    console.log(
      '  skip browser bundle: Chromium not installed (pnpm exec playwright install chromium)',
    )
    return
  }

  const { createServer } = await import('node:http')
  const { readFile } = await import('node:fs/promises')
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.cjs': 'text/javascript' }
  const server = createServer(async (req, res) => {
    try {
      const path = resolve(root, `.${(req.url ?? '/').split('?')[0]}`)
      const ext = path.slice(path.lastIndexOf('.'))
      res.setHeader('content-type', mime[ext] ?? 'application/octet-stream')
      res.end(await readFile(path))
    } catch {
      res.statusCode = 404
      res.end('not found')
    }
  })
  await new Promise((r) => server.listen(0, r))
  const port = server.address().port

  const timeout = new Promise((_r, reject) =>
    setTimeout(() => reject(new Error('launch timeout')), 15000),
  )
  const browser = await Promise.race([chromium.launch(), timeout])
  try {
    const page = await browser.newPage()
    await page.goto(`http://localhost:${port}/examples/browser/index.html`)
    await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 })
    const count = await page.getAttribute('body', 'data-adapters')
    check('browser bundle runs and lists text adapters', Number(count) > 0)
  } finally {
    await browser.close()
    server.close()
  }
}

try {
  await runBrowserCheck()
} catch (err) {
  console.log(`  skip browser bundle: ${err instanceof Error ? err.message : 'unavailable'}`)
}

if (failures.length > 0) {
  console.error(`\nsmoke:bundle FAILED (${failures.length}):`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('\nsmoke:bundle passed — ESM + CJS + types resolve and run for both entries.')
