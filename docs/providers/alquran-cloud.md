# Al-Quran Cloud — مرجع المزوّد

**العربية** · [English](/en/providers/alquran-cloud)

- **المعرّف:** `alquran_cloud` · **ملف المُحوّل:** `src/adapters/alquran-cloud.ts`
- **الصفحة الرئيسية / التوثيق:** https://alquran.cloud/api
- **المحتوى:** نصّ، صوت، ترجمة · **الاعتماد:** لا شيء · **يحتاج وسيطًا:** لا

## ما هذا المزوّد

واجهةٌ مفتوحةٌ واسعة التغطية، تخدم النصّ وأكثر من 400 نسخة (edition) نصّية وصوتية عبر شبكة
توصيلٍ عالمية (CDN)، بلا مفاتيح. لِمرونتها وثباتها نجعلها المزوّد الأساس لأكثر من نوعٍ من
المحتوى.

## نقاط النهاية المستعملة

الرابط الأساس: `https://api.alquran.cloud/v1`

- **النصّ (آية):** `GET /ayah/{surah}:{ayah}` — بلا اعتماد.
- **الصوت (آية):** `GET /ayah/{surah}:{ayah}/{edition}` حيث `edition` نسخةٌ صوتية، مثل
  `ar.alafasy` (افتراض المُحوّل).
- **الترجمة (آية):** `GET /ayah/{surah}:{ayah}/{edition}` حيث `edition` نسخةٌ مترجَمة، مثل
  `en.sahih`.

نقطةُ النهاية نفسُها تخدم النصّ والصوت والترجمة، ويُميّزها معرّفُ النسخة (`edition`).

## بنية الاستجابة الخام

```json
{
  "code": 200,
  "status": "OK",
  "data": {
    "number": 262,
    "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    "numberInSurah": 1,
    "juz": 1,
    "page": 1,
    "surah": { "number": 1, "name": "سُورَةُ ٱلْفَاتِحَةِ" },
    "edition": { "identifier": "quran-uthmani", "language": "ar", "format": "text" },
    "audio": "https://cdn.islamic.network/quran/audio/128/ar.alafasy/262.mp3",
    "audioSecondary": ["https://.../262.mp3"]
  }
}
```

عند طلب نسخةٍ صوتية يمتلئ الحقلان `audio` و`audioSecondary`؛ وعند طلب نسخةٍ مترجَمة يحمل
`text` الترجمةَ ويصف `edition` لغتَها.

## التحويل إلى البنية الموحّدة (والسبب)

**النصّ → `UnifiedVerse`:**

| الحقل الموحّد            | المصدر الخام                                       | ملاحظة                  |
| ------------------------ | -------------------------------------------------- | ----------------------- |
| `key`                    | `` `${data.surah.number}:${data.numberInSurah}` `` | مفتاحٌ متّسق `سورة:آية` |
| `id`                     | `data.number`                                      | رقم الآية العامّ        |
| `text`                   | `data.text`                                        | نصّ الآية               |
| `source`                 | `"Al-Quran Cloud"`                                 | ثابت                    |
| `meta.juz` / `meta.page` | `data.juz` / `data.page`                           | بيانات موضعية           |

**الصوت → `UnifiedAudio`:** `url` من `data.audio`، و`reciter` من معرّف النسخة، و`scope` =
`ayah`، و`audioSecondary` يُحفظ في `meta`. **الترجمة → `UnifiedTranslation`:** `text` من
`data.text`، و`language`/`edition` من `data.edition`.

نستعمل `numberInSurah` لا `number` في بناء `key` لأنّ `number` رقمٌ عامّ عبر المصحف كلّه،
بينما المفتاح الموحّد `سورة:آية`.

## الاعتماد

لا يلزم. جميع نقاط النهاية مفتوحة.

## حدود المعدّل والخصوصيات

توصيلٌ عبر CDN بحدودٍ سخيّة تكفي الاستعمال العاديّ. قائمةُ النسخ المتاحة في
`GET /edition` (نصّية وصوتية ومترجَمة). النسخة الصوتية تعيد رابط ملفّ mp3 جاهزًا.

## إبقاء هذه الصفحة محدّثة

قبل تعديل المُحوّل، راجِع التوثيق الحيّ وحدِّث العيّنة المسجّلة في
`test/fixtures/alquran_cloud/`. فحصُ الانحراف الحيّ عبر `pnpm test:live`.
