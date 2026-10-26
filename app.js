/* Smoove Prep — meal planning, nutrition, allergens, costing and labels.
   Everything is saved in this browser (localStorage). Use Settings → Export
   to back up or move your data to another device. */

const STORE_KEY = 'smoovePrep.v1';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

let state = load();
let currentTab = 'plan';
let labelSelection = null; // recipe ids chosen on the Labels tab

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked or corrupt — fall back to starter data */ }
  return structuredClone(SEED);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const uid = (p) => p + Math.random().toString(36).slice(2, 9);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '£' + (Number(n) || 0).toFixed(2);
const r1 = (n) => (Math.round((Number(n) || 0) * 10) / 10).toString();
const r0 = (n) => Math.round(Number(n) || 0).toString();
const ing = (id) => state.ingredients.find((i) => i.id === id);
const recipe = (id) => state.recipes.find((r) => r.id === id);
const activePlan = () => state.plans.find((p) => p.id === state.activePlan) || state.plans[0];

function emptyNutrition() {
  return Object.fromEntries(NUTRIENTS.map((n) => [n.key, 0]));
}

// Totals for a whole recipe batch, plus per-portion and per-100g figures.
function calcRecipe(r) {
  const total = emptyNutrition();
  let grams = 0, cost = 0;
  const allergens = new Set();
  for (const it of r.items) {
    const i = ing(it.ing);
    if (!i) continue;
    const q = Number(it.qty) || 0;
    grams += q;
    cost += (q / 1000) * (Number(i.costPerKg) || 0);
    for (const n of NUTRIENTS) total[n.key] += ((Number(i.n[n.key]) || 0) * q) / 100;
    i.allergens.forEach((a) => allergens.add(a));
  }
  const portions = Math.max(1, Number(r.portions) || 1);
  const perPortion = {}, per100 = {};
  for (const n of NUTRIENTS) {
    perPortion[n.key] = total[n.key] / portions;
    per100[n.key] = grams ? (total[n.key] / grams) * 100 : 0;
  }
  const costPortion = cost / portions;
  const net = (Number(r.price) || 0) / (1 + state.settings.vatRate / 100);
  const gp = net > 0 ? ((net - costPortion) / net) * 100 : 0;
  return {
    total, perPortion, per100, grams, portionGrams: grams / portions, cost, costPortion, gp, net,
    allergens: ALLERGENS.filter((a) => allergens.has(a))
  };
}

function allergenChips(list) {
  if (!list.length) return '<span class="chip">No listed allergens</span>';
  return list.map((a) => `<span class="chip allergen">${esc(a)}</span>`).join('');
}

// ---------- tabs ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (!b) return;
  currentTab = b.dataset.tab;
  document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('active', x === b));
  render();
});

function render() {
  const views = { plan: renderPlan, recipes: renderRecipes, ingredients: renderIngredients, shopping: renderShopping, labels: renderLabels, settings: renderSettings };
  $('#app').innerHTML = views[currentTab]();
  window.scrollTo({ top: 0 });
}

// ---------- modal ----------
// Short message at the bottom of the screen (replaces browser alert boxes).
function toast(msg) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 2600);
}

// In-app confirm / text prompt. Resolves to true, the typed text, or null if cancelled.
function ask({ title, message = '', input = null, ok = 'OK', danger = false }) {
  return new Promise((resolve) => {
    openModal(`<h2>${esc(title)}</h2>${message ? `<p>${esc(message)}</p>` : ''}
      ${input !== null ? `<input id="ask-input" required value="${esc(input)}">` : ''}`,
    (form) => { resolve(input !== null ? ($('#ask-input', form).value.trim() || null) : true); },
    (form) => {
      const b = form.querySelector('button[value="ok"]');
      b.textContent = ok;
      if (danger) b.classList.add('danger-fill');
      $('#modal').addEventListener('close', () => resolve(null), { once: true });
    });
  });
}

// Show text in a box with a copy button (used when the clipboard is refused).
function showText(title, text) {
  openModal(`<h2>${esc(title)}</h2><textarea id="show-text" rows="12" readonly>${esc(text)}</textarea>
    <button type="button" class="btn" id="show-copy">Copy</button>`, null, (form) => {
    $('#show-copy', form).onclick = () => {
      const ta = $('#show-text', form);
      navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => { ta.select(); toast('Selected — copy it from your keyboard menu'); });
    };
  });
}

function copyText(title, text) {
  if (!navigator.clipboard) { showText(title, text); return; }
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard'), () => showText(title, text));
}

function openModal(html, onSubmit, onReady) {
  const dlg = $('#modal');
  // Swap in a fresh form so listeners from the previous popup don't linger.
  const form = $('#modal-form').cloneNode(false);
  $('#modal-form').replaceWith(form);
  form.innerHTML = html + `
    <div class="row spread">
      <button class="btn" value="cancel" formnovalidate>Cancel</button>
      ${onSubmit ? '<button class="btn primary" value="ok">Save</button>' : ''}
    </div>`;
  form.onsubmit = (e) => {
    if (e.submitter && e.submitter.value === 'ok' && onSubmit) {
      const keepOpen = onSubmit(form) === false;
      if (keepOpen) { e.preventDefault(); return; }
      save(); render();
    }
  };
  if (onReady) onReady(form);
  dlg.showModal();
}

// =====================================================================
// MEAL PLAN
// =====================================================================
function renderPlan() {
  const plan = activePlan();
  const { slots, targets } = state.settings;
  const options = state.plans.map((p) => `<option value="${p.id}" ${p.id === plan.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

  let grid = '<div class="head"></div>' + DAYS.map((d) => `<div class="head">${d}</div>`).join('');
  for (const slot of slots) {
    grid += `<div class="head">${esc(slot)}</div>`;
    for (let d = 0; d < 7; d++) {
      const ids = plan.days[d]?.[slot] || [];
      grid += `<div class="slot">${ids.map((id, k) => {
        const r = recipe(id);
        return r ? `<div class="item"><span>${esc(r.name)}</span><button title="Remove" data-act="rm" data-d="${d}" data-s="${esc(slot)}" data-k="${k}">✕</button></div>` : '';
      }).join('')}<button class="add" data-act="add" data-d="${d}" data-s="${esc(slot)}">+ Add</button></div>`;
    }
  }

  // Day totals
  const weekAllergens = new Set();
  let weekCost = 0, weekKcal = 0, weekProtein = 0, daysWithFood = 0;
  grid += '<div class="head">Day total</div>';
  for (let d = 0; d < 7; d++) {
    const t = emptyNutrition();
    let cost = 0, count = 0;
    for (const slot of slots) {
      for (const id of plan.days[d]?.[slot] || []) {
        const r = recipe(id);
        if (!r) continue;
        const c = calcRecipe(r);
        NUTRIENTS.forEach((n) => (t[n.key] += c.perPortion[n.key]));
        cost += c.costPortion;
        c.allergens.forEach((a) => weekAllergens.add(a));
        count++;
      }
    }
    if (count) { daysWithFood++; weekKcal += t.kcal; weekProtein += t.protein; }
    weekCost += cost;
    const bar = (key, label, unit) => {
      const pct = targets[key] ? (t[key] / targets[key]) * 100 : 0;
      return `<div>${label} ${r0(t[key])}${unit} / ${targets[key]}${unit}<div class="bar ${pct > 105 ? 'over' : ''}"><span style="width:${Math.min(100, pct)}%"></span></div></div>`;
    };
    grid += `<div class="day-total">${bar('kcal', 'kcal', '')}${bar('protein', 'Protein', 'g')}${bar('carbs', 'Carbs', 'g')}${bar('fat', 'Fat', 'g')}<div class="muted">Food cost ${money(cost)}</div></div>`;
  }

  return `
  <section class="panel no-print">
    <div class="row spread">
      <div class="row">
        <label class="field">Plan<select id="plan-select">${options}</select></label>
        <label class="field">Customers / portions per meal<input id="plan-customers" type="number" min="1" value="${plan.customers}" style="width:110px"></label>
      </div>
      <div class="row">
        <button class="btn" data-act="new-plan">New plan</button>
        <button class="btn" data-act="dup-plan">Duplicate</button>
        <button class="btn" data-act="rename-plan">Rename</button>
        <button class="btn" data-act="clear-plan">Clear week</button>
        <button class="btn danger" data-act="del-plan">Delete</button>
        <button class="btn primary print-btn" onclick="window.print()">Print</button>
      </div>
    </div>
  </section>
  <section class="panel">
    <h2>${esc(plan.name)}</h2>
    <div class="cards" style="margin-bottom:1rem">
      <div class="card"><small>Average per day (per person)</small><b>${daysWithFood ? r0(weekKcal / daysWithFood) : 0} kcal · ${daysWithFood ? r0(weekProtein / daysWithFood) : 0}g protein</b></div>
      <div class="card"><small>Food cost for the week</small><b>${money(weekCost)} per person · ${money(weekCost * plan.customers)} for ${plan.customers}</b></div>
      <div class="card"><small>Allergens in this plan</small><div>${allergenChips(ALLERGENS.filter((a) => weekAllergens.has(a)))}</div></div>
    </div>
    <div class="plan-grid" id="plan-grid">${grid}</div>
  </section>`;
}

function pickRecipe(onPick) {
  const cats = [...new Set(state.recipes.map((r) => r.category))].sort();
  openModal(`
    <h2>Add a recipe</h2>
    <div class="row">
      <input id="rp-search" class="grow" placeholder="Search recipes…">
      <select id="rp-cat"><option value="">All categories</option>${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
    </div>
    <details><summary class="muted">Hide recipes containing…</summary><div class="allergen-pick" id="rp-free">
      ${ALLERGENS.map((a) => `<label><input type="checkbox" value="${esc(a)}"> ${esc(a)}</label>`).join('')}
    </div></details>
    <div id="rp-list" class="table-wrap"></div>`, null, (form) => {
    const draw = () => {
      const q = $('#rp-search', form).value.toLowerCase();
      const cat = $('#rp-cat', form).value;
      const avoid = [...form.querySelectorAll('#rp-free input:checked')].map((x) => x.value);
      const rows = state.recipes.filter((r) => {
        const c = calcRecipe(r);
        return r.name.toLowerCase().includes(q) && (!cat || r.category === cat) && !avoid.some((a) => c.allergens.includes(a));
      }).map((r) => {
        const c = calcRecipe(r);
        return `<tr><td><b>${esc(r.name)}</b><br><small>${esc(r.category)}</small></td>
          <td class="num">${r0(c.perPortion.kcal)} kcal<br><small>${r0(c.perPortion.protein)}g protein</small></td>
          <td><button type="button" class="btn small primary" data-pick="${r.id}">Add</button></td></tr>`;
      }).join('');
      $('#rp-list', form).innerHTML = rows ? `<table>${rows}</table>` : '<p class="muted">No matching recipes.</p>';
    };
    form.addEventListener('input', draw);
    $('#rp-list', form).addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      onPick(b.dataset.pick);
      save(); $('#modal').close(); render();
    });
    draw();
  });
}

// =====================================================================
// RECIPES
// =====================================================================
function renderRecipes() {
  const target = state.settings.targetGp;
  const cards = state.recipes.map((r) => {
    const c = calcRecipe(r);
    const p = c.perPortion;
    return `<div class="card">
      <div class="row spread"><h3>${esc(r.name)}</h3><span class="chip">${esc(r.category)}</span></div>
      <small>${r.portions} portion${r.portions > 1 ? 's' : ''} · ${r0(c.portionGrams)}g each</small>
      <div class="stats">
        <div><b>${r0(p.kcal)}</b>kcal</div><div><b>${r1(p.protein)}g</b>protein</div>
        <div><b>${r1(p.carbs)}g</b>carbs</div><div><b>${r1(p.fat)}g</b>fat</div>
      </div>
      <div>${allergenChips(c.allergens)}</div>
      <div class="row spread"><small>Cost ${money(c.costPortion)} · Price ${money(r.price)}</small>
        <b style="color:${c.gp >= target ? 'var(--brand)' : 'var(--accent)'}">GP ${r0(c.gp)}%</b></div>
      <div class="row">
        <button class="btn small" data-act="edit-recipe" data-id="${r.id}">Edit</button>
        <button class="btn small" data-act="dup-recipe" data-id="${r.id}">Duplicate</button>
        <button class="btn small danger" data-act="del-recipe" data-id="${r.id}">Delete</button>
      </div>
    </div>`;
  }).join('');
  return `<section class="panel"><div class="row spread"><div><h2>Recipes</h2>
    <small>Nutrition, allergens and cost are worked out from your ingredients. GP is after ${state.settings.vatRate}% VAT; target ${target}%.</small></div>
    <button class="btn primary" data-act="new-recipe">+ New recipe</button></div></section>
    <div class="cards">${cards || '<p class="muted">No recipes yet.</p>'}</div>`;
}

function editRecipe(id) {
  const existing = id ? recipe(id) : null;
  const r = existing ? structuredClone(existing) : { id: uid('r'), name: '', category: 'Prep meal', portions: 1, price: 0, items: [], method: '' };
  const ingOptions = (sel) => '<option value="">Choose ingredient…</option>' + [...state.ingredients].sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.name)}</option>`).join('');
  const row = (it = { ing: '', qty: '' }) => `<tr><td><select name="ri-ing">${ingOptions(it.ing)}</select></td>
    <td><input name="ri-qty" type="number" step="any" min="0" value="${it.qty}" style="width:90px"></td>
    <td><button type="button" class="btn small danger" data-rm-row>✕</button></td></tr>`;

  openModal(`
    <h2>${existing ? 'Edit' : 'New'} recipe</h2>
    <div class="grid-form">
      <label class="field" style="grid-column:span 2">Name<input name="name" required value="${esc(r.name)}"></label>
      <label class="field">Category<input name="category" list="cat-list" value="${esc(r.category)}"></label>
      <label class="field">Portions made<input name="portions" type="number" min="1" value="${r.portions}"></label>
      <label class="field">Sell price (inc VAT) £<input name="price" type="number" step="0.01" min="0" value="${r.price}"></label>
    </div>
    <datalist id="cat-list">${[...new Set(state.recipes.map((x) => x.category))].map((c) => `<option>${esc(c)}</option>`).join('')}</datalist>
    <div><h3>Ingredients <small>(grams or ml for the whole batch)</small></h3>
      <table><thead><tr><th>Ingredient</th><th>Qty</th><th></th></tr></thead><tbody id="ri-body">${r.items.map(row).join('') || row()}</tbody></table>
      <button type="button" class="btn small" id="ri-add">+ Add ingredient</button></div>
    <div id="ri-preview" class="muted"></div>
    <label class="field">Method / prep notes<textarea name="method">${esc(r.method)}</textarea></label>`,
  (form) => {
    const fd = new FormData(form);
    const ings = fd.getAll('ri-ing'), qtys = fd.getAll('ri-qty');
    r.name = fd.get('name').trim();
    r.category = fd.get('category').trim() || 'Other';
    r.portions = Math.max(1, parseInt(fd.get('portions'), 10) || 1);
    r.price = parseFloat(fd.get('price')) || 0;
    r.method = fd.get('method');
    r.items = ings.map((g, k) => ({ ing: g, qty: parseFloat(qtys[k]) || 0 })).filter((x) => x.ing && x.qty > 0);
    if (existing) Object.assign(existing, r); else state.recipes.push(r);
  },
  (form) => {
    const body = $('#ri-body', form);
    const preview = () => {
      const fd = new FormData(form);
      const qtys = fd.getAll('ri-qty');
      const tmp = { portions: fd.get('portions'), price: fd.get('price'), items: fd.getAll('ri-ing').map((g, k) => ({ ing: g, qty: qtys[k] })) };
      const c = calcRecipe(tmp);
      $('#ri-preview', form).innerHTML = `Per portion: <b>${r0(c.perPortion.kcal)} kcal</b>, ${r1(c.perPortion.protein)}g protein, ${r1(c.perPortion.carbs)}g carbs, ${r1(c.perPortion.fat)}g fat · cost ${money(c.costPortion)} · GP ${r0(c.gp)}%<br>${allergenChips(c.allergens)}`;
    };
    $('#ri-add', form).onclick = () => { body.insertAdjacentHTML('beforeend', row()); };
    body.addEventListener('click', (e) => { if (e.target.closest('[data-rm-row]')) { e.target.closest('tr').remove(); preview(); } });
    form.addEventListener('input', preview);
    form.addEventListener('change', preview);
    preview();
  });
}

// =====================================================================
// INGREDIENTS
// =====================================================================
function renderIngredients() {
  const rows = [...state.ingredients].sort((a, b) => a.name.localeCompare(b.name)).map((i) => `<tr>
    <td><b>${esc(i.name)}</b></td><td class="num">${money(i.costPerKg)}/${i.unit === 'ml' ? 'L' : 'kg'}</td>
    <td class="num">${r0(i.n.kcal)}</td><td class="num">${r1(i.n.protein)}</td><td class="num">${r1(i.n.carbs)}</td><td class="num">${r1(i.n.fat)}</td><td class="num">${r1(i.n.sugar)}</td>
    <td>${i.allergens.map((a) => `<span class="chip allergen">${esc(a)}</span>`).join('')}</td>
    <td><button class="btn small" data-act="edit-ing" data-id="${i.id}">Edit</button></td></tr>`).join('');
  return `<section class="panel"><div class="row spread"><div><h2>Ingredients</h2>
    <small>Values per 100g / 100ml. Take these from supplier spec sheets for accurate labels.</small></div>
    <div class="row"><input id="ing-search" placeholder="Search…"><button class="btn primary" data-act="new-ing">+ New ingredient</button></div></div>
    <div class="table-wrap"><table id="ing-table"><thead><tr><th>Name</th><th class="num">Cost</th><th class="num">kcal</th><th class="num">Protein</th><th class="num">Carbs</th><th class="num">Fat</th><th class="num">Sugar</th><th>Allergens</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></section>`;
}

function editIngredient(id) {
  const existing = id ? ing(id) : null;
  const i = existing ? structuredClone(existing) : { id: uid('i'), name: '', unit: 'g', costPerKg: 0, n: emptyNutrition(), allergens: [] };
  const usedIn = existing ? state.recipes.filter((r) => r.items.some((x) => x.ing === id)) : [];
  openModal(`
    <h2>${existing ? 'Edit' : 'New'} ingredient</h2>
    <div class="grid-form">
      <label class="field" style="grid-column:span 2">Name<input name="name" required value="${esc(i.name)}"></label>
      <label class="field">Measured in<select name="unit"><option value="g" ${i.unit === 'g' ? 'selected' : ''}>grams</option><option value="ml" ${i.unit === 'ml' ? 'selected' : ''}>ml</option></select></label>
      <label class="field">Cost £ per kg / litre<input name="costPerKg" type="number" step="0.01" min="0" value="${i.costPerKg}"></label>
    </div>
    <h3>Nutrition per 100g / 100ml</h3>
    <div class="grid-form">${NUTRIENTS.map((n) => `<label class="field">${n.label} (${n.unit})<input name="n-${n.key}" type="number" step="any" min="0" value="${i.n[n.key] ?? 0}"></label>`).join('')}</div>
    <h3>Allergens (UK 14)</h3>
    <div class="allergen-pick">${ALLERGENS.map((a) => `<label><input type="checkbox" name="allergen" value="${esc(a)}" ${i.allergens.includes(a) ? 'checked' : ''}> ${esc(a)}</label>`).join('')}</div>
    ${existing ? `<div class="row spread"><small>Used in: ${usedIn.map((r) => esc(r.name)).join(', ') || 'no recipes'}</small>
      <button type="button" class="btn small danger" id="ing-del">Delete ingredient</button></div>` : ''}`,
  (form) => {
    const fd = new FormData(form);
    i.name = fd.get('name').trim();
    i.unit = fd.get('unit');
    i.costPerKg = parseFloat(fd.get('costPerKg')) || 0;
    NUTRIENTS.forEach((n) => (i.n[n.key] = parseFloat(fd.get('n-' + n.key)) || 0));
    i.allergens = fd.getAll('allergen');
    if (existing) Object.assign(existing, i); else state.ingredients.push(i);
  },
  (form) => {
    const del = $('#ing-del', form);
    if (del) del.onclick = () => {
      if (usedIn.length) { toast('Remove it from ' + usedIn.map((r) => r.name).join(', ') + ' first'); return; }
      if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Tap again to delete'; return; }
      state.ingredients = state.ingredients.filter((x) => x.id !== id);
      save(); $('#modal').close(); render();
    };
  });
}

// =====================================================================
// SHOPPING LIST
// =====================================================================
function shoppingList(plan) {
  const totals = new Map();
  for (let d = 0; d < 7; d++) {
    for (const slot of state.settings.slots) {
      for (const id of plan.days[d]?.[slot] || []) {
        const r = recipe(id);
        if (!r) continue;
        const factor = plan.customers / Math.max(1, r.portions);
        for (const it of r.items) totals.set(it.ing, (totals.get(it.ing) || 0) + it.qty * factor);
      }
    }
  }
  return [...totals.entries()].map(([id, qty]) => {
    const i = ing(id);
    return i ? { i, qty, cost: (qty / 1000) * i.costPerKg } : null;
  }).filter(Boolean).sort((a, b) => a.i.name.localeCompare(b.i.name));
}

function fmtQty(qty, unit) {
  if (qty >= 1000) return r1(qty / 1000) + (unit === 'ml' ? ' L' : ' kg');
  return r0(qty) + ' ' + unit;
}

function renderShopping() {
  const plan = activePlan();
  const list = shoppingList(plan);
  const total = list.reduce((s, x) => s + x.cost, 0);
  const rows = list.map((x) => `<tr><td><input type="checkbox" class="no-print"> ${esc(x.i.name)}</td><td class="num">${fmtQty(x.qty, x.i.unit)}</td><td class="num">${money(x.cost)}</td></tr>`).join('');
  return `<section class="panel">
    <div class="row spread"><div><h2>Shopping list — ${esc(plan.name)}</h2>
      <small>For ${plan.customers} portion${plan.customers > 1 ? 's' : ''} of every meal in the week. Change the plan or numbers on the Meal plan tab.</small></div>
      <div class="row no-print"><button class="btn" data-act="copy-list">Copy as text</button><button class="btn primary print-btn" onclick="window.print()">Print</button></div></div>
    <div class="table-wrap"><table><thead><tr><th>Ingredient</th><th class="num">Quantity</th><th class="num">Est. cost</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="3" class="muted">Add meals to the plan to build a list.</td></tr>'}</tbody>
    <tfoot><tr><th>Total</th><th></th><th class="num">${money(total)}</th></tr></tfoot></table></div>
    <p class="muted">Quantities are as used in recipes. Add extra for waste and trimming.</p>
  </section>`;
}

// =====================================================================
// LABELS
// =====================================================================
function planRecipeIds(plan) {
  const ids = new Set();
  for (let d = 0; d < 7; d++) for (const slot of state.settings.slots) (plan.days[d]?.[slot] || []).forEach((id) => ids.add(id));
  return [...ids];
}

function labelHtml(r, prepDate) {
  const c = calcRecipe(r);
  const s = state.settings;
  // Ingredients in descending weight, allergens in bold.
  const merged = new Map();
  r.items.forEach((it) => merged.set(it.ing, (merged.get(it.ing) || 0) + Number(it.qty)));
  const ingText = [...merged.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => {
    const i = ing(id);
    if (!i) return '';
    return i.allergens.length ? `${esc(i.name)} (<b>${i.allergens.map(esc).join(', ')}</b>)` : esc(i.name);
  }).filter(Boolean).join(', ');
  const made = new Date(prepDate);
  const useBy = new Date(made); useBy.setDate(made.getDate() + Number(s.shelfLifeDays));
  const dfmt = (d) => isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const kj = (kcal) => r0(kcal * 4.184);
  const nutRows = NUTRIENTS.map((n) => {
    const a = c.per100[n.key], b = c.perPortion[n.key];
    const v = n.key === 'kcal' ? [`${kj(a)}kJ / ${r0(a)}kcal`, `${kj(b)}kJ / ${r0(b)}kcal`] : [r1(a) + 'g', r1(b) + 'g'];
    return `<tr><td>${n.label}</td><td>${v[0]}</td><td>${v[1]}</td></tr>`;
  }).join('');
  return `<div class="label">
    <h3>${esc(r.name)}</h3>
    <div class="ingr"><strong>Ingredients:</strong> ${ingText || '—'}</div>
    <div style="margin:.3rem 0"><strong>Allergens:</strong> ${c.allergens.length ? c.allergens.map(esc).join(', ') : 'None of the 14 listed allergens'}</div>
    <table><thead><tr><th>Nutrition</th><th>Per 100g</th><th>Per portion (${r0(c.portionGrams)}g)</th></tr></thead><tbody>${nutRows}</tbody></table>
    <div class="foot"><span>Made: ${dfmt(made)}<br><b>Use by: ${dfmt(useBy)}</b></span><span style="text-align:right">Keep refrigerated below 5°C<br>${esc(s.businessName)}, ${esc(s.address)}</span></div>
  </div>`;
}

function renderLabels() {
  const plan = activePlan();
  if (!labelSelection) labelSelection = planRecipeIds(plan);
  const today = new Date().toISOString().slice(0, 10);
  const prepDate = renderLabels.prepDate || today;
  const picks = state.recipes.map((r) => `<label><input type="checkbox" data-label="${r.id}" ${labelSelection.includes(r.id) ? 'checked' : ''}> ${esc(r.name)}</label>`).join('');
  const labels = state.recipes.filter((r) => labelSelection.includes(r.id)).map((r) => labelHtml(r, prepDate)).join('');
  return `<section class="panel no-print">
    <div class="row spread"><div><h2>Labels</h2><small>Ingredients by weight with allergens in bold, nutrition per 100g and per portion, use-by date. Check before use.</small></div>
      <div class="row"><label class="field">Prep date<input type="date" id="prep-date" value="${prepDate}"></label>
      <button class="btn" data-act="labels-plan">Use this week's plan</button><button class="btn primary print-btn" onclick="window.print()">Print labels</button></div></div>
    <div class="allergen-pick" style="margin-top:.6rem">${picks}</div>
  </section>
  <div class="labels">${labels || '<p class="muted">Pick recipes above.</p>'}</div>`;
}

// =====================================================================
// SETTINGS
// =====================================================================
function renderSettings() {
  const s = state.settings;
  return `<section class="panel"><h2>Business</h2>
    <form id="settings-form" class="grid-form">
      <label class="field">Business name<input name="businessName" value="${esc(s.businessName)}"></label>
      <label class="field">Address (for labels)<input name="address" value="${esc(s.address)}"></label>
      <label class="field">VAT rate %<input name="vatRate" type="number" step="any" value="${s.vatRate}"></label>
      <label class="field">Target GP %<input name="targetGp" type="number" step="any" value="${s.targetGp}"></label>
      <label class="field">Shelf life (days)<input name="shelfLifeDays" type="number" min="0" value="${s.shelfLifeDays}"></label>
      <label class="field">Daily kcal target<input name="t-kcal" type="number" value="${s.targets.kcal}"></label>
      <label class="field">Daily protein (g)<input name="t-protein" type="number" value="${s.targets.protein}"></label>
      <label class="field">Daily carbs (g)<input name="t-carbs" type="number" value="${s.targets.carbs}"></label>
      <label class="field">Daily fat (g)<input name="t-fat" type="number" value="${s.targets.fat}"></label>
      <label class="field" style="grid-column:1/-1">Meal slots (comma separated)<input name="slots" value="${esc(s.slots.join(', '))}"></label>
    </form>
    <div class="row" style="margin-top:.8rem"><button class="btn primary" data-act="save-settings">Save settings</button></div>
  </section>
  <section class="panel"><h2>Your data</h2>
    <p class="muted">Your data is saved in this browser on this device only. Make a backup regularly. To carry on on another device, restore the backup there.</p>
    <div class="row">
      <button class="btn" data-act="copy-backup">Copy backup</button>
      <button class="btn" data-act="paste-backup">Paste a backup</button>
      <button class="btn print-btn" data-act="export">Download backup file</button>
      <label class="btn">Restore from file<input type="file" id="import-file" accept="application/json" hidden></label>
      <button class="btn danger" data-act="reset">Reset to starter data</button>
    </div>
  </section>`;
}

// =====================================================================
// EVENTS
// =====================================================================
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.closest('#modal')) return;
  const plan = activePlan();
  const act = b.dataset.act;
  const d = b.dataset.d, slot = b.dataset.s;

  switch (act) {
    case 'add':
      pickRecipe((id) => {
        plan.days[d] ??= {};
        (plan.days[d][slot] ??= []).push(id);
      });
      return;
    case 'rm':
      plan.days[d][slot].splice(Number(b.dataset.k), 1);
      break;
    case 'new-plan':
      ask({ title: 'New plan', message: 'What should this plan be called?', input: 'New week', ok: 'Create' }).then((name) => {
        if (!name) return;
        const p = { id: uid('p'), name, customers: plan.customers, days: {} };
        state.plans.push(p); state.activePlan = p.id;
        save(); render();
      });
      return;
    case 'dup-plan': {
      const p = structuredClone(plan);
      p.id = uid('p'); p.name = plan.name + ' (copy)';
      state.plans.push(p); state.activePlan = p.id;
      break;
    }
    case 'rename-plan':
      ask({ title: 'Rename plan', input: plan.name, ok: 'Rename' }).then((name) => {
        if (!name) return;
        plan.name = name; save(); render();
      });
      return;
    case 'clear-plan':
      ask({ title: 'Clear week?', message: `This removes every meal from ${plan.name}.`, ok: 'Clear week', danger: true }).then((yes) => {
        if (!yes) return;
        plan.days = {}; save(); render();
      });
      return;
    case 'del-plan':
      if (state.plans.length === 1) { toast('You need at least one plan'); return; }
      ask({ title: 'Delete plan?', message: `${plan.name} will be deleted.`, ok: 'Delete', danger: true }).then((yes) => {
        if (!yes) return;
        state.plans = state.plans.filter((p) => p.id !== plan.id);
        state.activePlan = state.plans[0].id;
        save(); render();
      });
      return;
    case 'new-recipe': editRecipe(); return;
    case 'edit-recipe': editRecipe(b.dataset.id); return;
    case 'dup-recipe': {
      const r = structuredClone(recipe(b.dataset.id));
      r.id = uid('r'); r.name += ' (copy)';
      state.recipes.push(r);
      break;
    }
    case 'del-recipe': {
      const r = recipe(b.dataset.id);
      ask({ title: 'Delete recipe?', message: `${r.name} will also be removed from your meal plans.`, ok: 'Delete', danger: true }).then((yes) => {
        if (!yes) return;
        state.recipes = state.recipes.filter((x) => x.id !== r.id);
        for (const p of state.plans) for (const day of Object.values(p.days)) for (const s of Object.keys(day)) day[s] = day[s].filter((id) => id !== r.id);
        save(); render();
      });
      return;
    }
    case 'new-ing': editIngredient(); return;
    case 'edit-ing': editIngredient(b.dataset.id); return;
    case 'copy-list': {
      const text = `Shopping list — ${plan.name}\n` + shoppingList(plan).map((x) => `- ${x.i.name}: ${fmtQty(x.qty, x.i.unit)}`).join('\n');
      copyText('Shopping list', text);
      return;
    }
    case 'labels-plan': labelSelection = planRecipeIds(plan); break;
    case 'save-settings': {
      const fd = new FormData($('#settings-form'));
      const s = state.settings;
      s.businessName = fd.get('businessName');
      s.address = fd.get('address');
      s.vatRate = parseFloat(fd.get('vatRate')) || 0;
      s.targetGp = parseFloat(fd.get('targetGp')) || 0;
      s.shelfLifeDays = parseInt(fd.get('shelfLifeDays'), 10) || 0;
      ['kcal', 'protein', 'carbs', 'fat'].forEach((k) => (s.targets[k] = parseFloat(fd.get('t-' + k)) || 0));
      const slots = fd.get('slots').split(',').map((x) => x.trim()).filter(Boolean);
      if (slots.length) s.slots = slots;
      toast('Settings saved');
      break;
    }
    case 'export': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `smoove-prep-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    case 'copy-backup':
      copyText('Backup', JSON.stringify(state));
      return;
    case 'paste-backup':
      openModal(`<h2>Restore from a copied backup</h2><p class="muted">Paste the backup text you copied earlier. This replaces everything in the app.</p>
        <textarea id="paste-text" rows="10" required></textarea>`, (form) => {
        const ok = importBackup($('#paste-text', form).value);
        return ok ? undefined : false;
      });
      return;
    case 'reset':
      ask({ title: 'Reset to starter data?', message: 'This replaces all your recipes, ingredients and plans with the examples. Copy a backup first if you want to keep them.', ok: 'Reset', danger: true }).then((yes) => {
        if (!yes) return;
        state = structuredClone(SEED);
        labelSelection = null;
        save(); render();
        toast('Starter data restored');
      });
      return;
    default: return;
  }
  save(); render();
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'plan-select') { state.activePlan = t.value; labelSelection = null; save(); render(); }
  if (t.id === 'plan-customers') { activePlan().customers = Math.max(1, parseInt(t.value, 10) || 1); save(); render(); }
  if (t.id === 'prep-date') { renderLabels.prepDate = t.value; render(); }
  if (t.dataset.label) {
    const id = t.dataset.label;
    labelSelection = t.checked ? [...labelSelection, id] : labelSelection.filter((x) => x !== id);
    render();
  }
  if (t.id === 'import-file' && t.files[0]) {
    t.files[0].text().then((txt) => { if (importBackup(txt)) render(); });
  }
});

function importBackup(txt) {
  try {
    const data = JSON.parse(txt);
    if (!data.recipes || !data.ingredients || !data.plans) throw new Error('this is not a Smoove Prep backup');
    state = data; labelSelection = null; save();
    toast('Backup restored');
    return true;
  } catch (err) {
    toast('Could not restore: ' + (err instanceof SyntaxError ? 'the text is incomplete or not a backup' : err.message));
    return false;
  }
}

document.addEventListener('input', (e) => {
  if (e.target.id !== 'ing-search') return;
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#ing-table tbody tr').forEach((tr) => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

render();
