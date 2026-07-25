---
layout: home
title: quran-api-unified
titleTemplate: واجهة موحّدة لواجهات القرآن البرمجية
hero:
  name: quran-api-unified
  text: واجهةٌ واحدة لعدّة مزوّدات لبيانات القرآن
  tagline: نصّ الآيات والصوت والترجمة والتفسير من أكثر من مزوّد، مع اختيارٍ تلقائي للمزوّد ورجوعٍ احتياطي عند تعذّره — من غير أن يرتبط تطبيقك بمزوّدٍ بعينه.
  actions:
    - theme: brand
      text: ابدأ الآن
      link: /
    - theme: alt
      text: English
      link: /en/
features:
  - title: مزوّدٌ واحد أو أكثر بلا عناء
    details: اطلب ما تحتاجه فحسب؛ تتكفّل المكتبة باختيار المزوّد المناسب والرجوع إلى غيره تلقائيًا عند الفشل.
  - title: مخطّطٌ موحّد
    details: تُطبَّع مخرجات المزوّدين جميعًا إلى مخطّطٍ واحد متّسق، فلا تتعامل مع اختلاف الأشكال بين مزوّدٍ وآخر.
  - title: خفيفةٌ ومحايدة
    details: نواةٌ بلا اعتماديات، تعمل في Node والمتصفّح وDeno وBun — بلا إطار عمل ولا قاعدة بيانات.
---

## التثبيت

```bash
npm i quran-api-unified
# أو
pnpm add quran-api-unified
```

## البداية السريعة

```ts
import { createQuranClient } from 'quran-api-unified'

const quran = createQuranClient()

const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text', 'audio', 'translation', 'tafsir'],
})

if (res.ok) {
  console.log(res.value.text?.value?.text) // بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
  console.log(res.value.audio?.value?.url) // رابط التلاوة الصوتية
} else {
  console.error(res.error.code, res.attempts) // خطأ مُصنَّف، ومعه مسار المحاولات كاملًا
}
```

`createQuranClient()` لا يحتاج أيّ وسيط — المزوّدون بلا مفاتيح (Al-Quran Cloud، وQuran API
Edge، وQuran Hub، وQuran Explorer، وspa5k للتفسير) يغطّون أنواع المحتوى الأربعة كلّها من غير
إعداد.

## المفاهيم الأساسية

- **`ref`** — `{ surah, ayah }`. أَغفِل `ayah` لتعني "السورة كاملةً" (دعم نطاق السورة يختلف
  باختلاف نوع المحتوى؛ انظر كلّ نوعٍ أدناه).
- **`include`** — أنواع المحتوى المطلوبة: أيًّا من `'text'` و`'audio'` و`'translation'`
  و`'tafsir'`. يجلب `get()` جميعها بالتوازي، ولكلٍّ منها سلسلة الرجوع الاحتياطي الخاصّة به.
- **النتيجة بياناتٌ لا استثناءات.** لا يُطلق `get()` استثناءً إلا عند **سوء الاستخدام** —
  `include` فارغة، أو مصدرٌ مُسمًّى صراحةً غير معروف أو لا يخدم نوع المحتوى المطلوب أو ناقص
  بيانات الاعتماد. أمّا فشل المزوّد أو الشبكة فيعود دائمًا بيانةً: إمّا `res.ok: false` أو
  `Part` فاشل — انظر [التعامل مع النتائج الجزئية](#التعامل-مع-النتائج-الجزئية).

## أنواع المحتوى الأربعة

يقبل كلٌّ منها معرّفًا اختياريًّا لكلّ طلب؛ ويُستخدَم افتراضيّ المزوّد نفسه إن أُغفِل.

```ts
const res = await quran.get({
  ref: { surah: 2, ayah: 255 },
  include: ['text', 'audio', 'translation', 'tafsir'],
  reciter: 'ar.alafasy', // الصوت: معرّف القارئ (يختلف باختلاف المزوّد)
  edition: 'en.sahih', // الترجمة: معرّف الإصدار (يختلف باختلاف المزوّد)
  tafsirId: 'en-tafisr-ibn-kathir', // التفسير: معرّف الإصدار (يختلف باختلاف المزوّد)
})
```

| نوع المحتوى   | البنية (`res.value.<النوع>?.value`)                                 |
| ------------- | ------------------------------------------------------------------- |
| `text`        | `{ key, surah, ayah, source, text, meta? }`                         |
| `audio`       | `{ key, surah, ayah?, scope, source, reciter, url, format, meta? }` |
| `translation` | `{ key, surah, ayah, source, edition, language, text, meta? }`      |
| `tafsir`      | `{ key, surah, ayah, source, tafsirId, text, meta? }`               |

`key` هو دائمًا النصّ القياسي `"surah:ayah"`؛ و`source` هو الاسم الظاهر للمزوّد الذي خدَم
القيمة فعليًّا (مثل `"Al-Quran Cloud"`). راجع الصفحة المرجعية لكلّ مزوّدٍ تحت
[المزوّدون](#المزوّدون) لمعرفة المعرّف الذي يتوقّعه بالضبط لـ `reciter` أو `edition` أو
`tafsirId`.

## التعامل مع النتائج الجزئية

`res.ok` يغطّي الاستدعاء كلّه: يكون `true` ما دام نوعٌ واحدٌ على الأقلّ من الأنواع المطلوبة
قد نجح. وكلّ نوعٍ قابلٌ للفحص بمعزلٍ عن غيره، فلا يُسقِط فشل أحدها البقية:

```ts
const res = await quran.get({ ref: { surah: 18, ayah: 10 }, include: ['text', 'tafsir'] })

if (res.ok) {
  if (res.value.tafsir?.ok) {
    console.log(res.value.tafsir.value.text)
  } else {
    // ربما لا يغطّي هذا الإصدار هذه الآية — كلّ مزوّدٍ جُرِّب موجودٌ في .attempts
    console.warn(res.value.tafsir?.error?.code, res.value.tafsir?.attempts)
  }
}
```

كلّ `Part` (`res.value.text` و`.audio` و`.translation` و`.tafsir`) يحمل:

- `ok` / `value` / `error` — نتيجة هذا النوع.
- `source` — معرّف المُحوّل الذي خدَمه، عندما تكون `ok` صحيحة.
- `attempts` — كلّ مزوّدٍ جُرِّب لهذا النوع، بترتيبه، ولكلٍّ منها `adapterId` و`ok` و`error؟`
  و`durationMs؟` خاصّةً به.

## اختيار مزوّدٍ محدَّد

افتراضيًّا يختار كلّ نوعٍ تلقائيًّا من بين المُحوّلات المسجَّلة، بترتيب تسجيلها، متجاوزًا أيّ
مُحوّلٍ يحتاج بيانات اعتمادٍ لم تُزوّده بها. ولتثبيت نوعٍ على مزوّدٍ بعينه (بترتيب رجوعٍ
احتياطيّ من اختيارك)، مرِّر `source`:

```ts
const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  source: {
    text: { id: 'quran_hub', fallback: ['quran_finder', 'alquran_cloud'] },
  },
})
```

معرّفٌ غير معروف، أو مُحوّلٌ لا يخدم النوع المطلوب، أو ناقص بيانات اعتمادٍ مطلوبة — كلّ ذلك
يُعامَل هنا سوءَ استخدامٍ **ويُطلِق استثناءً**؛ فبما أنّك سمّيته صراحةً، ينبغي أن يظهر خطأ
الكتابة أو الافتراض الخاطئ فورًا لا أن يفشل بصمت.

## بيانات الاعتماد

المزوّدون بلا مفاتيح لا يحتاجون شيئًا. أمّا المزوّد الذي يتطلب اعتمادًا (حاليًّا
[Quran Foundation](/providers/quran-foundation)، بمنح OAuth2 لبيانات العميل) فيُهيَّأ لكلّ
معرّف مُحوّلٍ عند إنشاء العميل:

```ts
const quran = createQuranClient({
  credentials: {
    quran_foundation: { clientId: '...', secret: '...' },
  },
})
```

يستبدل العميل `clientId`/`secret` برمز وصولٍ عند نقطة نهاية المُحوّل، ويخزّنه مؤقّتًا طوال
صلاحيته، ويجدّده تلقائيًّا. وبلا بيانات اعتماد، يُتخطَّى المُحوّل الذي يتطلبها في الاختيار
التلقائيّ — فينجح طلبك بلا مفتاح عبر المزوّدين الآخرين — ولا يُطلق خطأً إلا إذا طلبتَه صراحةً
عبر `source`.

وإن كان لديك رمزٌ جاهزٌ مسبقًا (صُدر من مكانٍ آخر)، يمكنك تمريره مباشرةً وتخطّي الاستبدال:

```ts
const quran = createQuranClient({
  credentials: { quran_foundation: { accessToken: 'eyJ...' } },
})
```

## البيانات الخام

مرِّر `includeRaw: true` لتحصل أيضًا على استجابة كلّ مزوّدٍ الأصلية غير الموحّدة إلى جانب
القيمة الموحّدة — مفيدٌ للتنقيح أو لعرض مقارنةٍ بين الخام والموحّد:

```ts
const res = await quran.get({
  ref: { surah: 1, ayah: 1 },
  include: ['text'],
  includeRaw: true,
})

if (res.ok && res.value.text?.ok) {
  console.log(res.value.text.value) // القيمة الموحّدة UnifiedVerse
  console.log(res.value.text.raw) // استجابة المزوّد الأصلية (unknown)
}
```

لا يظهر `raw` إلا في `Part` ناجحٍ وعندما طُلِب `includeRaw` صراحةً — فتبقى النتائج خفيفةً
افتراضيًّا.

## تسجيل مُحوّلٍ مخصّص

المُحوّل وصفةٌ إعلانيّة — دالّة `buildUrl` مع `transform` نقيّة — لا صنفًا تُوَرِّثه. سجِّل
مُحوّلك الخاصّ لإضافة مزوّدٍ جديد أو لاستبدال مُحوّلٍ مدمجٍ بمعرّفه:

```ts
import { createQuranClient, type Adapter } from 'quran-api-unified'

const myProvider: Adapter = {
  id: 'my_provider',
  name: 'My Provider',
  capabilities: ['text'],
  auth: 'none',
  text: {
    buildUrl: (q) => `https://example.com/api/ayah/${q.surah}/${q.ayah ?? 1}`,
    transform: (raw, q) => {
      const data = raw as { text: string }
      return {
        key: `${q.surah}:${q.ayah ?? 1}`,
        surah: q.surah,
        ayah: q.ayah ?? 1,
        source: 'My Provider',
        text: data.text,
      }
    },
  },
}

const quran = createQuranClient({ adapters: [myProvider] })
// أو، لاستخدام مُحوّلاتك فقط بلا المُحوّلات المدمجة:
// createQuranClient({ adapters: [myProvider], useBuiltins: false })
```

بعد تسجيله، يشارك `myProvider` في الاختيار التلقائيّ إلى جانب المُحوّلات المدمجة (بترتيب
التسجيل)، ويمكن تسميته في `source.<النوع>.id`/`.fallback` كأيّ مُحوّلٍ آخر.

## التحقق بـ zod

مدخلٌ اختياريّ `quran-api-unified/zod` يُصدِّر مخطّطات zod للأشكال الموحّدة — zod اعتماديّةٌ
نظيرةٌ اختياريّة، لا جزءًا من النواة المُجمَّعة:

```ts
import { parseUnifiedVerse, unifiedVerseSchema } from 'quran-api-unified/zod'

const verse = parseUnifiedVerse(res.value.text?.value) // يُطلق استثناءً عند اختلاف البنية
const result = unifiedVerseSchema.safeParse(res.value.text?.value) // { success, data | error }
```

توجد أزواج `parse`/`safeParse` مطابقة للصوت والترجمة والتفسير (`parseUnifiedAudio`،
`parseUnifiedTranslation`، `parseUnifiedTafsir`، ونظيراتها `safeParse…`).

## المتصفّح وCORS

بعض المزوّدين (Quran Hub وQuran Explorer) لا يُرسلون ترويسات CORS، فتُفعِّل مُحوّلاتهم
`useProxy: true` وتحتاج وسيطًا مُهيَّأً ليعملا من المتصفّح:

```ts
const quran = createQuranClient({
  proxy: 'https://your-cors-proxy.example.com/?url=',
  // أو دالّة: proxy: (url) => `https://your-proxy.example.com/${url}`
})
```

اترك `proxy` بلا تهيئة خارج المتصفّح (Node وDeno وBun) — يعمل هذان المزوّدان مباشرةً بلا
وسيط هناك.

## البيئات المدعومة

تُشحَن بصيغتَي ESM وCJS معًا مع أنواع TypeScript كاملة، لـ Node والمتصفّح وDeno وBun:

```js
// ESM
import { createQuranClient } from 'quran-api-unified'
// CJS
const { createQuranClient } = require('quran-api-unified')
```

في بيئةٍ بلا `fetch` عامّة، مرِّرها صراحةً عبر `createQuranClient({ fetch })`.

## المزوّدون

لكلّ مزوّدٍ مدمجٍ صفحةٌ مرجعيّة تشرح واجهته الأصلية وسبب تحويلها على النحو المتّبع:

- [Quran Foundation](/providers/quran-foundation) — نصّ، OAuth2
- [Al-Quran Cloud](/providers/alquran-cloud) — نصّ، صوت، ترجمة
- [Quran API (Edge)](/providers/quran-api-edge) — نصّ، صوت
- [Quran Hub](/providers/quran-hub) — نصّ، عبر وسيط
- [Quran Explorer](/providers/quran-finder) — نصّ، عبر وسيط
- [Tafsir API (spa5k)](/providers/spa5k-tafsir) — تفسير

راجع [سجلّ التغييرات](https://github.com/Ibrahim-Rezq/quran-api-unified/blob/main/CHANGELOG.md)
لتاريخ الإصدارات، و[دليل المساهمة](https://github.com/Ibrahim-Rezq/quran-api-unified/blob/main/CONTRIBUTING.md)
لعقد المُحوّل إن رغبت في المساهمة بمزوّدٍ جديد.
