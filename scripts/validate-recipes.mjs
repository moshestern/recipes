import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(here, '../data/recipes.json');
const db = JSON.parse(await readFile(jsonPath, 'utf8'));

const errors = [];
const warnings = [];
const seenRecipeIds = new Set();
const seenNames = new Set();
const tagCounts = new Map();
let ingredientCount = 0;
let referencedIngredientCount = 0;
let timedSteps = 0;
let offeredTimerSteps = 0;
let rangedTimerSteps = 0;
let preparedNeedSteps = 0;

const addTag = tag => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
const sourceLanguage = /(לפי השיחה|השיחה הראשונה|במקור|בפועל המשתמש|גרסה מוקדמת|בשיחה המקורית)/i;

if (!Array.isArray(db.recipes)) errors.push('recipes must be an array');
if (db.recipe_count !== db.recipes?.length) errors.push(`recipe_count is ${db.recipe_count}, but recipes.length is ${db.recipes?.length}`);

for (const recipe of db.recipes || []) {
  if (!recipe.id) errors.push(`Recipe without id: ${recipe.name || '(unnamed)'}`);
  if (seenRecipeIds.has(recipe.id)) errors.push(`Duplicate recipe id: ${recipe.id}`);
  seenRecipeIds.add(recipe.id);

  if (!recipe.name) errors.push(`Recipe ${recipe.id} has no name`);
  if (seenNames.has(recipe.name)) errors.push(`Duplicate recipe name: ${recipe.name}`);
  seenNames.add(recipe.name);

  if (!recipe.category) errors.push(`Recipe ${recipe.name} has no category`);
  if (recipe.source) {
    if (!recipe.source.name) errors.push(`${recipe.name}: source has no name`);
    if (!recipe.source.url) errors.push(`${recipe.name}: source has no url`);
    else {
      try {
        const url = new URL(recipe.source.url);
        if (!['http:', 'https:'].includes(url.protocol)) errors.push(`${recipe.name}: source url must be http(s)`);
      } catch {
        errors.push(`${recipe.name}: source url is invalid`);
      }
    }
  }
  const recipeTags = recipe.tags || [];
  if (new Set(recipeTags).size !== recipeTags.length) errors.push(`${recipe.name}: duplicate tags in recipe`);
  for (const tag of recipeTags) addTag(tag);

  const dietTags = (recipe.tags || []).filter(tag => ['בשרי', 'חלבי', 'פרווה'].includes(tag));
  if (dietTags.length > 1) errors.push(`${recipe.name}: contradictory dietary tags: ${dietTags.join(', ')}`);

  if (!Array.isArray(recipe.ingredient_groups) || recipe.ingredient_groups.length === 0) errors.push(`${recipe.name}: no ingredient groups`);
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) errors.push(`${recipe.name}: no preparation steps`);

  const ingredientIds = new Set();
  for (const group of recipe.ingredient_groups || []) {
    for (const item of group.items || []) {
      ingredientCount++;
      if (!item.id) errors.push(`${recipe.name}: ingredient without id`);
      if (ingredientIds.has(item.id)) errors.push(`${recipe.name}: duplicate ingredient id ${item.id}`);
      ingredientIds.add(item.id);
      if (!item.display && !item.name) errors.push(`${recipe.name}: ingredient ${item.id} has no display/name`);
    }
  }

  const referenced = new Set();
  const stepIds = new Set();
  for (const step of recipe.steps || []) {
    if (stepIds.has(step.id)) errors.push(`${recipe.name}: duplicate step id ${step.id}`);
    stepIds.add(step.id);
    if (!step.instruction) errors.push(`${recipe.name}: step ${step.id} has no instruction`);
    if (step.timer_minutes != null) {
      const timer = Number(step.timer_minutes);
      if (!Number.isFinite(timer) || timer <= 0) errors.push(`${recipe.name}: invalid timer_minutes in step ${step.id}`);
      else timedSteps++;
    }
    if (step.suggest_timer === true) {
      const timer = Number(step.timer_minutes);
      if (!Number.isFinite(timer) || timer <= 0) errors.push(`${recipe.name}: suggest_timer requires valid timer_minutes in step ${step.id}`);
      else offeredTimerSteps++;
    }
    if (step.timer_options != null) {
      if (!Array.isArray(step.timer_options) || step.timer_options.length < 2) {
        errors.push(`${recipe.name}: timer_options must contain at least 2 values in step ${step.id}`);
      } else {
        const options = step.timer_options.map(Number);
        if (options.some(value => !Number.isFinite(value) || value <= 0)) errors.push(`${recipe.name}: invalid timer_options in step ${step.id}`);
        if (new Set(options).size !== options.length) errors.push(`${recipe.name}: duplicate timer_options in step ${step.id}`);
        const defaultTimer = Number(step.timer_minutes);
        if (!options.includes(defaultTimer)) errors.push(`${recipe.name}: timer_options do not include timer_minutes in step ${step.id}`);
        if (defaultTimer !== Math.min(...options)) warnings.push(`${recipe.name}: timer default is not the lower bound in step ${step.id}`);
        rangedTimerSteps++;
      }
    }
    if (Array.isArray(step.needs) && step.needs.length) {
      preparedNeedSteps++;
      for (const need of step.needs) {
        if (typeof need === 'string') continue;
        if (need?.label) continue;
        if (need?.ingredient_ref) {
          if (!ingredientIds.has(need.ingredient_ref)) errors.push(`${recipe.name}: step ${step.id} needs unknown ingredient ${need.ingredient_ref}`);
          continue;
        }
        errors.push(`${recipe.name}: invalid needs item in step ${step.id}`);
      }
    }
    for (const ref of step.ingredient_refs || []) {
      if (!ingredientIds.has(ref)) errors.push(`${recipe.name}: step ${step.id} references unknown ingredient ${ref}`);
      referenced.add(ref);
    }
  }

  for (const id of ingredientIds) {
    if (referenced.has(id)) referencedIngredientCount++;
    else errors.push(`${recipe.name}: ingredient ${id} is never referenced by a step`);
  }

  const visible = JSON.stringify({
    name: recipe.name,
    servings: recipe.servings,
    tags: recipe.tags,
    ingredient_groups: recipe.ingredient_groups,
    steps: recipe.steps,
    variations: recipe.variations,
    storage: recipe.storage,
    notes: recipe.notes,
  });
  if (sourceLanguage.test(visible)) errors.push(`${recipe.name}: visible content still contains source/history language`);

  if (!Object.values(recipe.times || {}).some(Boolean)) errors.push(`${recipe.name}: no summary time is defined`);
}

if (tagCounts.has('אפשר להכין מראש')) errors.push('Legacy tag "אפשר להכין מראש" should be normalized to "מתאים להכנה מראש"');

console.log(`Recipes: ${db.recipes?.length || 0}`);
console.log(`Tags: ${tagCounts.size}`);
console.log(`Ingredients: ${ingredientCount} (${referencedIngredientCount} referenced)`);
console.log(`Timed steps: ${timedSteps}; suggested timer buttons: ${offeredTimerSteps}; ranged timers: ${rangedTimerSteps}`);
console.log(`Cooking-mode steps with prepared needs: ${preparedNeedSteps}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach(w => console.log(`- ${w}`));
}

if (errors.length) {
  console.error(`\nErrors (${errors.length}):`);
  errors.forEach(e => console.error(`- ${e}`));
  process.exitCode = 1;
} else {
  console.log('\nValidation passed with no errors.');
}
