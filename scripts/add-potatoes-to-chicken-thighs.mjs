import fs from 'node:fs';

const path = 'data/recipes.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const recipe = data.recipes.find(r => r.id === 'hen-chicken-thighs-sweet-potato-onion');
if (!recipe) throw new Error('Recipe not found');

const group = recipe.ingredient_groups.find(g => g.name === 'מצרכים');
if (!group) throw new Error('Ingredient group not found');

if (!group.items.some(i => i.id === 'potatoes')) {
  const sweetPotatoIndex = group.items.findIndex(i => i.id === 'sweet_potatoes');
  group.items.splice(sweetPotatoIndex + 1, 0, {
    id: 'potatoes',
    name: 'תפוחי אדמה',
    quantity: '12 קטנים / 4 גדולים',
    display: 'כ־12 תפוחי אדמה קטנים, או 4 תפוחי אדמה גדולים חתוכים לרבעים'
  });
}

const mixStep = recipe.steps.find(s => s.id === 3);
if (!mixStep) throw new Error('Mix step not found');
mixStep.instruction = 'מניחים בתבנית או בסיר שמתאים לתנור 1 ק״ג פרגיות, 4–5 בטטות קטנות (כ־600 גרם), כ־12 תפוחי אדמה קטנים או 4 תפוחי אדמה גדולים חתוכים לרבעים, ו־2 בצלים סגולים. מוסיפים את תערובת הסויה והקורנפלור, ¼ כוס סילאן, ¼ כוס שמן זית, 4 שיני שום כתושות, 1 כף פפריקה מתוקה, 1 כף תבלין טוסקנה אופציונלי, 2 כפיות מלח ו־¼ כפית פלפל שחור ומערבבים היטב.';
if (!mixStep.ingredient_refs.includes('potatoes')) {
  const sweetPotatoRefIndex = mixStep.ingredient_refs.indexOf('sweet_potatoes');
  mixStep.ingredient_refs.splice(sweetPotatoRefIndex + 1, 0, 'potatoes');
}

const roastStep = recipe.steps.find(s => s.id === 4);
if (!roastStep) throw new Error('Roast step not found');
roastStep.instruction = 'צולים ב־200°C בערך שעה, עד שהפרגיות שחומות והבטטות ותפוחי האדמה רכים. במהלך הצלייה מרטיבים מדי פעם את הפרגיות, הבטטות, תפוחי האדמה והבצל ברוטב שבתחתית התבנית בעזרת כף או מברשת.';
if (!roastStep.ingredient_refs.includes('potatoes')) {
  const sweetPotatoRefIndex = roastStep.ingredient_refs.indexOf('sweet_potatoes');
  roastStep.ingredient_refs.splice(sweetPotatoRefIndex + 1, 0, 'potatoes');
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
