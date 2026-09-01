# מה מבשלים היום

אתר מתכונים אישי וסטטי, מותאם בעיקר למובייל, עם חיפוש, קטגוריות, תגיות ומצב בישול שלב־אחר־שלב.

## מבנה הפרויקט

```text
.
├── index.html
├── app.js
├── styles.css
├── favicon.svg
├── data/
│   └── recipes.json
├── images/
│   └── recipes/
├── scripts/
│   └── validate-recipes.mjs
├── 404.html
└── CNAME.example
```

## הרצה מקומית

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

ואז לפתוח:

```text
http://localhost:8080
```

ממכשיר אחר באותה רשת, פתחו `http://<LOCAL-IP>:8080`.

## בדיקת הנתונים

```bash
node scripts/validate-recipes.mjs
```

## העלאה ראשונה ל-GitHub

1. צור Repository חדש וריק ב-GitHub, למשל `what-to-cook`.
2. אל תיצור README או `.gitignore` דרך GitHub, כדי למנוע conflict בהעלאה הראשונה.
3. מתוך התיקייה המקומית של הפרויקט:

```bash
git init
git add .
git commit -m "Initial recipe site"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

אם אתה משתמש ב-HTTPS במקום SSH:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

## הפעלת GitHub Pages

ב-Repository ב-GitHub:

**Settings → Pages → Build and deployment**

בחר:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

אחרי השמירה GitHub יציג את כתובת ה-Pages.

## חיבור subdomain מותאם אישית

נניח שהדומיין הוא `example.com` ורוצים:

```text
recipes.example.com
```

1. העתק את `CNAME.example` ל-`CNAME` ושנה את תוכנו ל:

```text
recipes.example.com
```

2. בצע commit ו-push:

```bash
git add CNAME
git commit -m "Configure custom domain"
git push
```

3. אצל ספק ה-DNS צור רשומת CNAME:

```text
Type: CNAME
Name/Host: recipes
Target: YOUR_USERNAME.github.io
```

4. ב-GitHub: **Settings → Pages → Custom domain** והזן `recipes.example.com`.
5. לאחר שה-DNS מתעדכן, הפעל `Enforce HTTPS`.

> חשוב: ב-subdomain משתמשים בדרך כלל ב-CNAME ל-`YOUR_USERNAME.github.io`, לא לכתובת ה-repository המלאה.

## הוספת מתכון חדש

האתר קורא את המתכונים מ-`data/recipes.json`. לכל מתכון יש `id` ייחודי, והתמונה שלו נשמרת ב:

```text
images/recipes/<recipe-id>.webp
```

השדה ב-JSON:

```json
"image": "./images/recipes/<recipe-id>.webp"
```

אחרי שינוי מתכונים מומלץ תמיד להריץ:

```bash
node scripts/validate-recipes.mjs
```

ואז:

```bash
git add data/recipes.json images/recipes
git commit -m "Add recipe: <name>"
git push
```

## לקראת Agent לעדכון המתכונים

התהליך שאנחנו רוצים לאוטומט:

1. קבלת מתכון משיחה / URL / טקסט / צילום.
2. המרה לסכמת `recipes.json`.
3. שמירת הגרסה הסופית והווריאציות הרלוונטיות.
4. הוספת קטגוריה ותגיות.
5. הוספת זמנים, `needs` ו-timers למצב בישול.
6. יצירת/עדכון תמונה אחידה ושמירתה כ-WebP בשם ה-`id`.
7. הרצת validator.
8. יצירת commit ו-push או Pull Request ל-GitHub.

מומלץ שה-Agent יעבוד דרך Pull Request ולא ישירות ל-`main`, כדי שאפשר יהיה לבדוק כל שינוי לפני פרסום.
