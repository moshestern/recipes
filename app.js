const app = document.querySelector('#app');
let db;
let ui = { query: '', category: 'כל הקטגוריות', tag: '', tagsOpen: false };
let timerInterval = null;
let timerState = loadTimer();
let timerAudioCtx = null;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function allIngredients(recipe) {
  return recipe.ingredient_groups.flatMap(group => group.items);
}

function ingredientMap(recipe) {
  return Object.fromEntries(allIngredients(recipe).map(item => [item.id, item]));
}

function timeText(recipe, { compact = false } = {}) {
  const t = recipe.times || {};
  const bits = [];
  if (t.prep_minutes) bits.push(`${t.prep_minutes} דק׳ הכנה`);
  if (t.cook_minutes) bits.push(`${t.cook_minutes} דק׳ בישול`);
  if (t.bake_minutes) bits.push(`${t.bake_minutes} דק׳ אפייה`);
  if (!compact && t.rest_minutes) bits.push(`${t.rest_minutes} דק׳ מנוחה`);
  if (!compact && t.chill_minutes) bits.push(`${t.chill_minutes} דק׳ קירור`);
  return bits.join(' · ');
}

function safeDecode(value) {
  try { return decodeURIComponent(value); }
  catch { return value; }
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function sourceTemplate(recipe) {
  if (!recipe.source?.name || !recipe.source?.url) return '';
  const url = safeExternalUrl(recipe.source.url);
  if (!url) return '';
  const author = recipe.source.author ? ` · ${escapeHtml(recipe.source.author)}` : '';
  return `<div class="recipe-source">מקור: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(recipe.source.name)}</a>${author}</div>`;
}

function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts[0] === 'recipe' && parts[1]) return { page: 'recipe', id: safeDecode(parts[1]) };
  if (parts[0] === 'cook' && parts[1]) {
    const parsedStep = Number(parts[2] || 1);
    const step = Number.isFinite(parsedStep) && parsedStep >= 1 ? Math.floor(parsedStep) : 1;
    return { page: 'cook', id: safeDecode(parts[1]), step };
  }
  return { page: 'home' };
}

function navigate(hash) {
  if (location.hash === hash) render({ scrollTop: true });
  else location.hash = hash;
}

function loadTimer() {
  try {
    const raw = sessionStorage.getItem('recipeTimer');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Number.isFinite(Number(parsed.endAt)) || !Number.isFinite(Number(parsed.durationMinutes))) {
      sessionStorage.removeItem('recipeTimer');
      return null;
    }
    parsed.endAt = Number(parsed.endAt);
    parsed.durationMinutes = Number(parsed.durationMinutes);
    parsed.stepId = Number(parsed.stepId);
    return parsed;
  } catch {
    sessionStorage.removeItem('recipeTimer');
    return null;
  }
}

function saveTimer() {
  if (timerState) sessionStorage.setItem('recipeTimer', JSON.stringify(timerState));
  else sessionStorage.removeItem('recipeTimer');
}

function timerRemainingMs() {
  return timerState ? Math.max(0, timerState.endAt - Date.now()) : 0;
}

function formatTimer(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function timerLabel(minutes) {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} שע׳`;
  return `${minutes} דק׳`;
}

function shouldOfferTimer(step) {
  return step.suggest_timer === true && Number(step.timer_minutes || 0) > 0;
}

function timerChoices(step) {
  if (!shouldOfferTimer(step)) return [];
  const fallback = Number(step.timer_minutes);
  const options = Array.isArray(step.timer_options) ? step.timer_options.map(Number) : [fallback];
  return [...new Set([fallback, ...options])].filter(value => Number.isFinite(value) && value > 0);
}

function cookNeeds(recipe, step) {
  const map = ingredientMap(recipe);
  if (Array.isArray(step.needs) && step.needs.length) {
    return step.needs.map(need => {
      if (typeof need === 'string') return { text: need, prepared: true };
      if (need?.label) return { text: need.label, prepared: true };
      if (need?.ingredient_ref && map[need.ingredient_ref]) {
        const item = map[need.ingredient_ref];
        return { text: item.display || item.name, prepared: false };
      }
      return null;
    }).filter(Boolean);
  }
  return (step.ingredient_refs || []).map(id => map[id]).filter(Boolean)
    .map(item => ({ text: item.display || item.name, prepared: false }));
}

function startTimer(minutes, recipeId, stepId, label) {
  primeTimerAudio();
  const durationMs = Number(minutes) * 60 * 1000;
  timerState = {
    endAt: Date.now() + durationMs,
    durationMinutes: Number(minutes),
    recipeId,
    stepId,
    label
  };
  saveTimer();
  ensureTimerTicker();
  updateTimerUi();
}

function cancelTimer() {
  timerState = null;
  saveTimer();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateTimerUi();
}

function finishTimer() {
  const completed = timerState;
  timerState = null;
  saveTimer();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  playTimerSound();
  if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 500]);
  render({ scrollTop: false });
  if (completed && document.visibilityState === 'visible') {
    setTimeout(() => alert(`הטיימר הסתיים${completed.label ? ` — ${completed.label}` : ''}`), 50);
  }
}

function primeTimerAudio() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!timerAudioCtx) timerAudioCtx = new AudioCtx();
    if (timerAudioCtx.state === 'suspended') timerAudioCtx.resume();
  } catch {}
}

function playTimerSound() {
  try {
    primeTimerAudio();
    const ctx = timerAudioCtx;
    if (!ctx) return;
    [0, .28, .56].forEach(delay => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(.18, ctx.currentTime + delay + .02);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + .2);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + .22);
    });
  } catch {}
}

function ensureTimerTicker() {
  if (!timerState) return;
  if (timerRemainingMs() <= 0) {
    finishTimer();
    return;
  }
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      if (!timerState) return;
      if (timerRemainingMs() <= 0) finishTimer();
      else updateTimerUi();
    }, 1000);
  }
}

function timerBarTemplate() {
  if (!timerState || timerRemainingMs() <= 0) return '';
  return `<div class="active-timer" id="active-timer" role="status">
    <span class="active-timer-icon">⏱</span>
    <div class="active-timer-copy">
      <strong id="active-timer-time">${formatTimer(timerRemainingMs())}</strong>
      <span>${escapeHtml(timerState.label || 'טיימר פעיל')}</span>
    </div>
    <button class="timer-cancel" type="button" data-cancel-timer aria-label="בטל טיימר">ביטול</button>
  </div>`;
}

function timerButtonTemplate(recipe, step) {
  const choices = timerChoices(step);
  if (!choices.length) return '';
  const activeForThisStep = timerState && timerState.recipeId === recipe.id && timerState.stepId === step.id && timerRemainingMs() > 0;
  if (activeForThisStep) {
    return `<button class="timer-button is-active" type="button" data-cancel-timer>⏱ ${formatTimer(timerRemainingMs())} · ביטול</button>`;
  }
  const buttons = choices.map((minutes, index) => `
    <button class="timer-button ${index ? 'timer-button-alt' : ''}" type="button" data-start-timer="${minutes}" data-timer-recipe="${escapeHtml(recipe.id)}" data-timer-step="${escapeHtml(step.id)}" data-timer-label="${escapeHtml(step.title || recipe.name)}">${index ? '' : '⏱ '}${timerLabel(minutes)}</button>`).join('');
  return `<div class="timer-controls" aria-label="אפשרויות טיימר">${buttons}${choices.length > 1 ? '<span class="timer-hint">מומלץ להתחיל בזמן הקצר ולבדוק מוכנות</span>' : ''}</div>`;
}


function recipeVisual(recipe, { large = false } = {}) {
  const category = recipe.category || '';
  const visuals = {
    'עוף': ['🍗', 'visual-chicken'],
    'בשר': ['🥘', 'visual-meat'],
    'דגים': ['🐟', 'visual-fish'],
    'קינוחים': ['🍰', 'visual-dessert'],
    'תוספות': ['🥔', 'visual-side'],
    'רטבים וממרחים': ['🌿', 'visual-sauce'],
    'פשטידות ומאפים': ['🥧', 'visual-bake']
  };
  const [icon, className] = visuals[category] || ['🍽️', 'visual-default'];
  const sizeClass = large ? 'recipe-visual-large' : 'recipe-visual-card';
  if (recipe.image) {
    return `<span class="recipe-visual ${sizeClass} has-image"><img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}" loading="lazy" /></span>`;
  }
  return `<span class="recipe-visual ${sizeClass} ${className}" aria-hidden="true"><span class="recipe-visual-icon">${icon}</span><span class="recipe-visual-shape"></span></span>`;
}
function homeTemplate() {
  const categories = ['כל הקטגוריות', ...new Set(db.recipes.map(r => r.category))];
  const tags = [...new Set(db.recipes.flatMap(r => r.tags || []))]
    .sort((a,b) => a.localeCompare(b, 'he'));

  const q = ui.query.trim().toLowerCase();
  const filtered = db.recipes.filter(recipe => {
    const haystack = [recipe.name, recipe.category, ...(recipe.tags || []), ...allIngredients(recipe).map(i => i.name)].join(' ').toLowerCase();
    return (!q || haystack.includes(q)) &&
      (ui.category === 'כל הקטגוריות' || recipe.category === ui.category) &&
      (!ui.tag || (recipe.tags || []).includes(ui.tag));
  });

  const activeTagLabel = ui.tag || 'תגיות';

  return `
    <main class="shell">
      <section class="hero">
        <h1>מה מבשלים היום</h1>
        <span class="hero-stat"><strong>${db.recipes.length}</strong> מתכונים</span>
      </section>

      <section class="filters" aria-label="סינון מתכונים">
        <div class="search-row">
          <input class="search" id="search" type="search" value="${escapeHtml(ui.query)}" placeholder="חיפוש לפי שם או מרכיב…" autocomplete="off" aria-label="חיפוש מתכונים לפי שם או מרכיב" />
          <select class="select" id="category" aria-label="בחירת קטגוריה">
            ${categories.map(c => `<option ${c===ui.category?'selected':''}>${escapeHtml(c)}</option>`).join('')}
          </select>
          <div class="tag-filter">
            <button
              class="tag-filter-button ${ui.tag ? 'has-active-tag' : ''}"
              id="tag-filter-button"
              type="button"
              aria-expanded="${ui.tagsOpen ? 'true' : 'false'}"
              aria-controls="tag-popover"
              title="סינון לפי תגית"
            ><span class="tag-icon">#</span><span class="tag-label">${escapeHtml(activeTagLabel)}</span></button>
            <div class="tag-popover" id="tag-popover" role="dialog" aria-label="סינון לפי תגית" ${ui.tagsOpen ? '' : 'hidden'}>
              <div class="tag-popover-title">סינון לפי תגית</div>
              <div class="tag-options">
                <button class="chip ${!ui.tag?'active':''}" type="button" data-tag="" aria-pressed="${!ui.tag ? 'true' : 'false'}">כל התגיות</button>
                ${tags.map(tag => `<button class="chip ${ui.tag===tag?'active':''}" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="${ui.tag===tag ? 'true' : 'false'}">${escapeHtml(tag)}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="results-head"><h2>מתכונים</h2><span>${filtered.length} תוצאות</span></div>
      ${filtered.length ? `<section class="recipe-grid">
        ${filtered.map(recipe => `
          <button class="recipe-card" type="button" data-recipe="${escapeHtml(recipe.id)}">
            ${recipeVisual(recipe)}
            <span class="recipe-card-body">
              <span class="card-category">${escapeHtml(recipe.category)}</span>
              <span class="recipe-card-title">${escapeHtml(recipe.name)}</span>
              <span class="card-meta">${escapeHtml([recipe.servings, timeText(recipe, { compact: true })].filter(Boolean).join(' · '))}</span>
              <span class="card-tags">${(recipe.tags || []).slice(0,4).map(t => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')}</span>
            </span>
          </button>`).join('')}
      </section>` : `<div class="empty">לא נמצאו מתכונים שמתאימים לסינון.</div>`}
      ${timerBarTemplate()}
    </main>`;
}

function notesTemplate(recipe) {
  if (!(recipe.notes || []).length) return '';
  return `<section class="panel notes-panel"><h2>טיפים</h2>${recipe.notes.map(note => `<div class="variation">${escapeHtml(note)}</div>`).join('')}</section>`;
}

function recipeTemplate(recipe) {
  const storage = recipe.storage && Object.keys(recipe.storage).length
    ? `<div class="panel"><h2>שמירה</h2>${Object.entries(recipe.storage).map(([k,v]) => `<div class="variation"><strong>${k==='refrigerator'?'מקרר':k==='freezer'?'מקפיא':k==='reheat'?'חימום מחדש':escapeHtml(k)}</strong>${escapeHtml(v)}</div>`).join('')}</div>` : '';

  return `
    <main class="shell">
      <button class="back" type="button" data-home>← חזרה לכל המתכונים</button>
      <section class="recipe-head">
        <div class="recipe-head-copy">
          <span class="card-category">${escapeHtml(recipe.category)}</span>
          <h1>${escapeHtml(recipe.name)}</h1>
          <div class="recipe-sub">${[recipe.servings, timeText(recipe)].filter(Boolean).map(x=>`<span>${escapeHtml(x)}</span>`).join('<span>·</span>')}</div>
          <div class="recipe-tag-list">${(recipe.tags||[]).map(t=>`<span class="card-tag">${escapeHtml(t)}</span>`).join('')}</div>
          ${sourceTemplate(recipe)}
          <div class="actions"><button class="primary" type="button" data-cook="${escapeHtml(recipe.id)}">התחל מצב בישול</button></div>
        </div>
        ${recipeVisual(recipe, { large: true })}
      </section>

      <div class="recipe-layout">
        <div>
          <section class="panel">
            <h2>מצרכים</h2>
            ${recipe.ingredient_groups.map(group => `
              <div class="ingredient-group">
                ${recipe.ingredient_groups.length > 1 ? `<h3>${escapeHtml(group.name)}</h3>` : ''}
                <ul class="ingredients">${group.items.map(item => `<li>${escapeHtml(item.display || item.name)}${item.notes ? `<span class="ingredient-note">${escapeHtml(item.notes)}</span>`:''}</li>`).join('')}</ul>
              </div>`).join('')}
          </section>
          ${(recipe.variations||[]).length ? `<section class="panel" style="margin-top:18px"><h2>אפשרויות ושינויים</h2>${recipe.variations.map(v=>`<div class="variation"><strong>${escapeHtml(v.title)}</strong>${escapeHtml(v.description)}</div>`).join('')}</section>` : ''}
          ${storage ? `<div style="margin-top:18px">${storage}</div>` : ''}
          ${(recipe.notes||[]).length ? `<div style="margin-top:18px">${notesTemplate(recipe)}</div>` : ''}
        </div>

        <section class="panel">
          <h2>אופן ההכנה</h2>
          <ol class="steps">${recipe.steps.map((step,idx)=>`<li class="step"><span class="step-num">${idx+1}</span><div><h3>${escapeHtml(step.title || `שלב ${idx+1}`)}</h3><p>${escapeHtml(step.instruction)}</p>${timerButtonTemplate(recipe, step)}</div></li>`).join('')}</ol>
        </section>
      </div>
      ${timerBarTemplate()}
    </main>`;
}

function cookTemplate(recipe, stepNumber) {
  const stepIndex = Math.max(0, Math.min(recipe.steps.length - 1, stepNumber - 1));
  const step = recipe.steps[stepIndex];
  const needs = cookNeeds(recipe, step);
  const pct = ((stepIndex + 1) / recipe.steps.length) * 100;
  return `
    <main class="cook-shell">
      <section class="cook-card">
        <div class="cook-top">
          <button class="back" type="button" data-recipe-back="${escapeHtml(recipe.id)}">✕ יציאה</button>
          <small>${stepIndex+1} מתוך ${recipe.steps.length}</small>
        </div>
        <div class="progress"><div style="width:${pct}%"></div></div>
        <h1>${escapeHtml(step.title || `שלב ${stepIndex+1}`)}</h1>
        <p class="cook-instruction">${escapeHtml(step.instruction)}</p>
        ${timerButtonTemplate(recipe, step)}
        ${needs.length ? `<div class="cook-ingredients"><strong>בשלב הזה צריך:</strong><ul>${needs.map(item=>`<li class="${item.prepared ? 'prepared-need' : ''}">${escapeHtml(item.text)}</li>`).join('')}</ul></div>` : ''}
        <div class="cook-nav">
          <button class="secondary" type="button" data-cook-step="${stepIndex}" ${stepIndex===0?'disabled':''}>הקודם</button>
          ${stepIndex < recipe.steps.length-1
            ? `<button class="primary" type="button" data-cook-step="${stepIndex+2}">הבא</button>`
            : `<button class="primary" type="button" data-recipe-back="${escapeHtml(recipe.id)}">סיימתי ✓</button>`}
        </div>
      </section>
      ${timerBarTemplate()}
    </main>`;
}

function bindHome() {
  document.querySelector('#search')?.addEventListener('input', e => {
    ui.query = e.target.value;
    render({ scrollTop: false });
    requestAnimationFrame(() => {
      const el = document.querySelector('#search');
      el?.focus();
      el?.setSelectionRange(ui.query.length, ui.query.length);
    });
  });

  document.querySelector('#category')?.addEventListener('change', e => {
    ui.category = e.target.value;
    ui.tagsOpen = false;
    render({ scrollTop: false });
  });

  document.querySelector('#tag-filter-button')?.addEventListener('click', e => {
    e.stopPropagation();
    ui.tagsOpen = !ui.tagsOpen;
    render({ scrollTop: false });
    if (ui.tagsOpen) requestAnimationFrame(() => document.querySelector('#tag-filter-button')?.focus());
  });

  document.querySelector('#tag-popover')?.addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll('[data-tag]').forEach(el => el.addEventListener('click', () => {
    ui.tag = el.dataset.tag;
    ui.tagsOpen = false;
    render({ scrollTop: false });
  }));

  document.querySelectorAll('[data-recipe]').forEach(el => el.addEventListener('click', () => navigate(`#/recipe/${encodeURIComponent(el.dataset.recipe)}`)));
}

function bindShared() {
  document.querySelectorAll('[data-home]').forEach(el => el.addEventListener('click', () => navigate('#/')));
  document.querySelectorAll('[data-cook]').forEach(el => el.addEventListener('click', () => navigate(`#/cook/${encodeURIComponent(el.dataset.cook)}/1`)));
  document.querySelectorAll('[data-recipe-back]').forEach(el => el.addEventListener('click', () => navigate(`#/recipe/${encodeURIComponent(el.dataset.recipeBack)}`)));
  document.querySelectorAll('[data-cook-step]').forEach(el => el.addEventListener('click', () => {
    if (el.disabled) return;
    const r = route();
    navigate(`#/cook/${encodeURIComponent(r.id)}/${el.dataset.cookStep}`);
  }));
  document.querySelectorAll('[data-start-timer]').forEach(el => el.addEventListener('click', () => {
    startTimer(el.dataset.startTimer, el.dataset.timerRecipe, Number(el.dataset.timerStep), el.dataset.timerLabel);
    render({ scrollTop: false });
  }));
  document.querySelectorAll('[data-cancel-timer]').forEach(el => el.addEventListener('click', () => {
    cancelTimer();
    render({ scrollTop: false });
  }));
}

function updateTimerUi() {
  if (!timerState || timerRemainingMs() <= 0) return;
  document.querySelectorAll('#active-timer-time').forEach(el => el.textContent = formatTimer(timerRemainingMs()));
  const r = route();
  if (r.page === 'recipe' || r.page === 'cook') {
    const recipe = db?.recipes.find(x => x.id === r.id);
    if (recipe) {
      document.querySelectorAll('.timer-button.is-active').forEach(el => {
        el.textContent = `⏱ ${formatTimer(timerRemainingMs())} · ביטול`;
      });
    }
  }
}

function render({ scrollTop = false } = {}) {
  const r = route();
  if (r.page === 'home') {
    app.innerHTML = homeTemplate();
    bindHome();
  } else {
    const recipe = db.recipes.find(x => x.id === r.id);
    if (!recipe) { navigate('#/'); return; }
    app.innerHTML = r.page === 'recipe' ? recipeTemplate(recipe) : cookTemplate(recipe, r.step);
  }
  bindShared();
  ensureTimerTicker();
  if (scrollTop) window.scrollTo(0, 0);
}

async function boot() {
  try {
    const res = await fetch('./data/recipes.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    db = await res.json();
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && ui.tagsOpen) {
        ui.tagsOpen = false;
        render({ scrollTop: false });
      }
    });
    document.addEventListener('click', e => {
      if (ui.tagsOpen && !e.target.closest('.tag-filter')) {
        ui.tagsOpen = false;
        render({ scrollTop: false });
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (timerState && timerRemainingMs() <= 0) finishTimer();
      else updateTimerUi();
    });
    window.addEventListener('hashchange', () => render({ scrollTop: true }));
    ensureTimerTicker();
    render({ scrollTop: true });
  } catch (error) {
    console.error(error);
    app.innerHTML = `<div class="empty"><strong>לא הצלחתי לטעון את קובץ המתכונים.</strong><br>יש להריץ את האתר דרך שרת מקומי קטן ולא לפתוח את index.html ישירות.</div>`;
  }
}

boot();
