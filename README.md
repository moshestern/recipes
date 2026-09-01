# מה מבשלים היום? 🍲

אתר המתכונים האישי שלי — ארכיון מתכונים פשוט, מהיר ונוח לשימוש, בעיקר בזמן בישול מהטלפון.

🌐 **האתר:** [recipes.moshestern.co.il](http://recipes.moshestern.co.il/)

האתר בנוי כאתר סטטי ללא backend וללא framework. כל המתכונים נשמרים בקובץ JSON אחד, התמונות נשמרות בתוך ה־repository, והפרסום נעשה אוטומטית דרך GitHub Pages.

## מה יש באתר

- חיפוש חופשי במתכונים
- סינון לפי קטגוריות ותגיות
- תמונה ייעודית לכל מתכון
- עמוד מתכון נוח לקריאה במובייל
- מצב בישול שלב־אחר־שלב
- הצגת המצרכים הדרושים בכל שלב
- טיימרים מובנים בשלבים שבהם הם שימושיים
- תמיכה בזמני טווח, למשל 15–20 דקות
- שמירת טיימר פעיל גם אם עוברים זמנית לטאב אחר
- תמיכה במקורות חיצוניים למתכונים
- GitHub Pages + custom domain

## מבנה הפרויקט

```text
.
├── index.html
├── app.js
├── styles.css
├── favicon.svg
├── CNAME
├── data/
│   └── recipes.json
├── images/
│   └── recipes/
│       └── <recipe-id>.webp
├── scripts/
│   └── validate-recipes.mjs
├── .github/
│   ├── workflows/
│   │   └── validate-recipes.yml
│   └── pull_request_template.md
├── AGENTS.md
└── docs/
    └── RECIPE_AGENT.md
```

## מקור הנתונים

`data/recipes.json` הוא מקור האמת של האתר.

לכל מתכון יש `id` ייחודי. תמונת המתכון נשמרת בשם זהה:

```text
images/recipes/<recipe-id>.webp
```

והמתכון מפנה אליה כך:

```json
"image": "./images/recipes/<recipe-id>.webp"
```

הנתונים כוללים בין היתר:

- שם ותיאור
- קטגוריות ותגיות
- מצרכים וכמויות
- שלבי הכנה
- `ingredient_refs` לקישור בין שלב למצרכים
- `needs` עבור תוצרים שכבר הוכנו בשלבים קודמים
- זמני הכנה / בישול / אפייה / מנוחה
- `suggest_timer` עבור טיימרים מומלצים
- מקור למתכונים חיצוניים

## כלל כתיבה חשוב למתכונים

המתכון מציג קודם רשימת מצרכים מלאה, אבל גם בתוך הוראות ההכנה הכמויות חוזרות שוב במקום שבו משתמשים במרכיב.

לדוגמה, לא רק:

> מוסיפים את השמן והבצל.

אלא:

> מחממים 3 כפות שמן ומטגנים 2 בצלים קצוצים.

כך אפשר לבשל ישירות מתוך השלבים בלי לחזור כל הזמן לרשימת המצרכים.

## הרצה מקומית

אין build step ואין dependencies לאתר עצמו.

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

ואז לפתוח:

```text
http://localhost:8080
```

## Validation

אחרי כל שינוי במתכונים:

```bash
node scripts/validate-recipes.mjs
```

ה־validator בודק בין היתר תקינות מבנה הנתונים, מזהים, הפניות למצרכים, מקורות ושדות נוספים שבהם האתר משתמש.

אותה בדיקה רצה גם אוטומטית ב־GitHub Actions בכל Pull Request ובכל push ל־`main`.

## פרסום

האתר מתפרסם באמצעות **GitHub Pages** ישירות מה־branch `main`, מתיקיית השורש של ה־repository.

Repository:

```text
https://github.com/moshestern/recipes
```

Custom domain:

```text
recipes.moshestern.co.il
```

רשומת ה־DNS היא CNAME אל:

```text
moshestern.github.io
```

## הוספה ועדכון של מתכונים

הדרך המומלצת היא לעבוד דרך **Recipe Agent**. הוראות העבודה המלאות נמצאות ב־[`AGENTS.md`](./AGENTS.md) וב־[`docs/RECIPE_AGENT.md`](./docs/RECIPE_AGENT.md).

ה־Agent אמור לדעת לקבל:

- מתכון שנוצר בשיחת ChatGPT
- טקסט שהודבק לצ׳ט
- URL למתכון חיצוני
- בקשה לתקן מתכון קיים
- צילום של המנה הסופית לצורך יצירת תמונה אחידה לאתר

לאחר מכן הוא:

1. מעדכן את `data/recipes.json`.
2. מוסיף או מחליף את תמונת ה־WebP המתאימה.
3. שומר על מוסכמות הנתונים והכתיבה של האתר.
4. מריץ את ה־validator.
5. יוצר Pull Request מסודר ל־GitHub.

## תמונות

התמונות באתר נשמרות כ־WebP ביחס 4:3 ובשפה ויזואלית אחידה: צילום אוכל ריאליסטי, ביתי אבל אסתטי, אור טבעי חם, שולחן ניטרלי וללא טקסט על התמונה.

בעתיד, כאשר יש צילום אמיתי של מנה, ניתן להשתמש בו כבסיס ליצירת גרסה אחידה בסגנון האתר ולדרוס את הקובץ הקיים באותו `recipe-id`.

## טכנולוגיה

- HTML
- CSS
- Vanilla JavaScript
- JSON
- GitHub Pages
- GitHub Actions לצורך validation

אין framework, bundler, database או backend.
