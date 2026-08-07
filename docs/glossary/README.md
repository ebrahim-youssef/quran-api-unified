# Quranic terminology glossary

`quranic-terminology.json` is a reference glossary of Quranic terms, extracted from a
community-maintained spreadsheet (linked in the root README's credits section) for the
terminology-unification work tracked in issue #5.

This is a **reference document, not a package artifact** — nothing under `src/` imports it,
and it ships in neither the `dist/` build nor the published npm package. It exists so schema
and naming decisions (e.g. `ayah` → `verse`, `surah` → `chapter`) have a citable source instead
of an ad hoc call each time a term comes up.

## Fields

Each entry has exactly three fields, taken directly from the source spreadsheet's own columns:

| Field | Source column | Meaning |
| --- | --- | --- |
| `arabic` | المصطلح بالعربي | The term itself, in Arabic, with tashkeel as given. |
| `englishTranslation` | الترجمة الإنجليزية | The common English rendering — often a transliteration/loanword (e.g. `Surah`, `Ayah`). |
| `literalTranslation` | الترجمة الحرفية | The semantic English equivalent (e.g. `Chapter`, `Verse`) — usually the more useful field when picking an API identifier, since the goal is English vocabulary, not transliterated Arabic. |

Data is copied verbatim from the source; it has not been edited, corrected, or re-translated,
except one filled-in blank: the source left `جِذْرُ الْكَلِمَةِ` (Word Root)'s literal-translation
cell empty, and `englishTranslation`/`literalTranslation` are identical there since the two
columns agree for that term.
