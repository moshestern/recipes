# Recipe Repository Agent Instructions

These instructions apply to any AI agent editing this repository.

## Goal

Maintain the personal recipe website at `recipes.moshestern.co.il` while preserving its established recipe structure, UX conventions and visual consistency.

`data/recipes.json` is the source of truth.

## Golden rules

1. Never invent recipe details that are not supported by the user's recipe, the supplied conversation, or the supplied source.
2. When a conversation contains revisions, use the final decision. Do not preserve abandoned intermediate versions unless the user explicitly wants both alternatives.
3. When multiple alternatives remain valid at the end, preserve them as legitimate options.
4. Do not add editorial phrases such as "לפי השיחה", "במקור", "המשתמש בחר" or other history/meta commentary to recipe content.
5. Keep kosher compatibility. For meat recipes, do not introduce dairy ingredients.
6. Every ingredient used by the recipe must be represented consistently in the data model and references.
7. Quantities must appear in the ingredient list AND be repeated naturally in the preparation step where the ingredient is used.
8. Do not silently change quantities, cooking temperatures or durations merely to make a recipe look more conventional.

## New recipe workflow

When adding a recipe:

1. Read `data/recipes.json` and inspect similar existing recipes before choosing fields, categories or tags.
2. Choose a stable lowercase kebab-case `id` in English.
3. Add all ingredients with quantities.
4. Write clear preparation steps in Hebrew.
5. Repeat ingredient quantities inside the relevant preparation steps.
6. Populate `ingredient_refs` for ingredients used by each step.
7. Use `needs` when a step uses an intermediate prepared component rather than raw ingredients, e.g. "רוטב הבשר המוכן".
8. Add structured timing information when supported by the recipe.
9. Set `suggest_timer: true` only for a step where an in-site timer is genuinely useful. Do not enable timers just because a step has a duration.
10. Preserve time ranges as ranges when the recipe says e.g. 15–20 minutes.
11. Add categories/tags by reusing the repository vocabulary where possible.
12. Add `source` for external recipes.
13. Add an image at `images/recipes/<id>.webp` and set the recipe's `image` field accordingly.
14. Run `node scripts/validate-recipes.mjs`.
15. Do not submit changes if validation fails.

## Existing recipe updates

When editing an existing recipe:

- Change only what the user requested plus any strictly necessary structural references.
- Preserve the recipe `id` unless there is a compelling technical reason to change it.
- If the `id` changes, rename its image and update all references.
- Re-run validation after every change.

## External recipe sources

When a recipe comes from a website:

- Preserve factual quantities, timing, temperatures and meaningful options.
- Rewrite instructions into this archive's concise standardized style instead of copying expressive prose verbatim.
- Include:

```json
"source": {
  "name": "<site name>",
  "author": "<author if known>",
  "url": "https://..."
}
```

- Do not claim authorship by the repository owner.

## Images

Recipe images should be:

- WebP
- 4:3 aspect ratio
- realistic food photography
- homemade but photogenic
- warm natural light
- neutral clean tabletop
- soft shadows
- refined editorial look, not commercial advertising
- slightly angled 3/4 camera view
- no text, labels or watermark

If the user supplies a photograph of the actual finished dish, use it as the visual reference and keep the same site-wide style.

The filename must be:

```text
images/recipes/<recipe-id>.webp
```

## Pull requests

Prefer a Pull Request over direct edits to `main`.

PR title examples:

```text
Add recipe: קציצות בשר ובטטה
Update recipe: חריימה מנסיכת הנילוס
```

The PR description should summarize the recipe/content changes and state that validation passes.

## Codex code review instructions

When reviewing a Pull Request in this repository, prioritize correctness of the recipe archive and the mobile website over generic style comments.

Review the complete diff and relevant surrounding code/data. Report only actionable issues that could cause incorrect recipe content, broken UX, inconsistent data, regressions, or deployment problems.

Check especially for:

1. **Recipe fidelity** — quantities, temperatures, durations and final user decisions must not be silently changed or invented.
2. **Ingredient consistency** — every ingredient used in preparation should exist in the ingredient list; quantities should be repeated naturally in the relevant steps; `ingredient_refs` must match the intended ingredients.
3. **Intermediate components** — assembly steps should use `needs` for prepared components when appropriate instead of incorrectly re-listing raw ingredients.
4. **Timers** — `suggest_timer` should only be enabled when useful, and timer values/ranges must agree with the preparation text.
5. **Kosher consistency** — meat recipes must not accidentally introduce dairy ingredients or dairy tags.
6. **Sources** — externally sourced recipes should preserve factual recipe details, include valid source metadata, and avoid unnecessary verbatim copying.
7. **Images** — new recipes should have `images/recipes/<id>.webp`; the JSON image path and recipe `id` must stay in sync.
8. **Schema and validation** — changes must remain compatible with `scripts/validate-recipes.mjs`; flag cases where the validator passes but semantic references are still clearly wrong.
9. **UI regressions** — verify search, category/tag filtering, recipe detail routing and cooking mode are not broken by changes to `app.js`, `styles.css`, `index.html`, or recipe fields.
10. **Mobile UX** — pay special attention to narrow-screen layout, touch targets, bottom sheets/popovers, cooking-mode readability and timer controls.
11. **GitHub Pages compatibility** — keep the site static and compatible with deployment from the repository root; avoid absolute paths or routing changes that would break `recipes.moshestern.co.il` or GitHub Pages.
12. **Scope discipline** — flag unrelated changes bundled into a recipe PR when they increase risk or make review harder.

Do not request changes solely for personal formatting preferences when the existing repository conventions are internally consistent.

If no meaningful issue is found, approve or clearly state that no actionable problems were identified.

## Before finishing

Always verify:

- JSON parses successfully.
- `node scripts/validate-recipes.mjs` passes.
- Every new recipe has an image.
- Image path matches the recipe id.
- No ingredient references are broken.
- Timers are intentionally suggested.
- No abandoned conversation alternatives leaked into the final recipe.
