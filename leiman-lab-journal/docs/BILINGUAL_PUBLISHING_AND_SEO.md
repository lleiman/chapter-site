# Leiman Lab · bilingual editorial and SEO contract (18 November 2026)

## Publication policy

- Russian origin pages remain at `/articles/{slug}`; English translations use `/en/articles/{slug}`.
- A translation must contain independently edited `title`, `summary`, `deck`, `description`, `paragraphs`, `sourceNote`, `tags`, and estimated `readingMinutes`. Each published article uses original sources or adds credible sources relevant to the English edition.
- Never publish a placeholder English URL or a page translated only in the header. The server exposes English article URLs only when a content file has nonempty `translations.en.paragraphs`, and lists only those articles on `/en/`.
- English and Russian pages each have a self-referencing canonical, matching `html[lang]`, article `inLanguage`, localized title and description, appropriate OG locale, unique indexable content, and reciprocal `hreflang` entries in both HTML head and sitemap.
- Publish both languages together for **all future articles** (starting issue 009), and edit sources for meaning rather than machine-translate indiscriminately.
- Keep articles sourced. Separate verified research, inference and product hypotheses. Update `dateModified` on substantial corrections. Use public primary sources wherever possible.
- Retain a unique social preview cover for each issue. Verify raster `/og/{slug}.png` response and share snippets. Do not index search results, unpublished drafts, admin pages or CV information.
- Do not copy the same target keywords into every article. SEO is about page-specific intent and correct markup, not keywords by the kilogram.

## Translation backlog and coverage

As of 18 November 2026: **9 Russian and 9 English journal articles**. All nine existing journal entries now have complete paragraph-level English editions and independent English metadata.

| Issue | Slug | English edition |
| --- | --- | --- |
| 001 | black-october | Published |
| 002 | warhound | Published |
| 003 | human-voice | Published |
| 004 | after-black-october | Published |
| 005 | ai-index-2026 | Published |
| 006 | attention-economy-ai-2026 | Published |
| 007 | period-poluraspada-novogo | Published |
| 008 | ai-film-competitions-2026 | Published |
| 009 | ai-income-opportunities | Published |

Each published Russian article now has an English equivalent with an independently indexable canonical URL and reciprocal hreflang. Continue to require full bilingual content for every new issue.

Product microsites `/ai-index`, `/ai-film-awards`, `/predictions`, `/commons`, `/about` are separate from journal articles and still require dedicated bilingual content. Do not mistake a global EN nav for localized product content.

## Verification checklist

1. `npm test` and `npm run check` pass on the deployment commit.
2. EN and RU articles render with matching canonical, title, page language, OG locale, JSON-LD, language switch and reciprocal hreflang.
3. XML sitemap includes only live, published translation variants and their reciprocals.
4. Main domain returns HTTP 200; deprecated hostnames redirect to canonical.
5. Manual content check: English article has no untranslated Russian prose, except quoted original names or citations.
6. Check canonical content and indexing in Google Search Console after recrawl; passing HTML checks is not a guarantee Google has indexed a URL.
7. Check hero and cover readability at 375 px and 1440 px; share image should be 1200×630 raster.
8. Review publication dates and time-sensitive factual claims on every scheduled editorial refresh.

## Income Intelligence pilot

Pilot source atlas: `/opportunities` and `/en/opportunities`. Official directories are **not** a live, verified job feed.

CV pilot: explicit consent, separate contact opt-in, encrypted local records on a mounted volume, deletion token, automatic retention cleanup, operator access behind `ADMIN_PASSWORD`. No AI analysis, automatic applications or payment checkout is running. Avoid using protected data in ranking or redistributing profiles. A product launch still needs legal, privacy, threat-model, accessibility and abuse reviews.

Pricing ranges and opportunity-score weights in article 009 are hypotheses requiring user tests.
