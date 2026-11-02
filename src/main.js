// Browser entry point: wires the engine to the DOM and persists the reign.
import { newGame, decree, advance, perform } from './engine/game.js';
import { SAVE_VERSION } from './engine/state.js';
import { renderHud, renderDock, renderThrone, renderMobileBar, chipHtml, md } from './ui/render.js';
import { DESK_RENDERERS } from './ui/desks.js';

const SAVE_KEY = 'horus-in-the-flesh/save';
const TAB_KEY = 'horus-in-the-flesh/tab';
const $hud = document.getElementById('hud');
const $dock = document.getElementById('dock');
const $view = document.getElementById('view');
const $confirm = document.getElementById('confirm-new');
const $error = document.getElementById('error');
const $toasts = document.getElementById('toasts');
const $mbar = document.getElementById('mbar');

let state = load() || newGame(Date.now());
let tab = readTab();

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === SAVE_VERSION ? s : null;
  } catch {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked: the reign simply isn't saved */
  }
}
function readTab() {
  try {
    return localStorage.getItem(TAB_KEY) || 'throne';
  } catch {
    return 'throne';
  }
}
function setTab(t) {
  tab = t;
  try {
    localStorage.setItem(TAB_KEY, t);
  } catch {
    /* ignore */
  }
}

function render({ scroll = false } = {}) {
  if (state.phase === 'ended') tab = 'throne';
  $hud.innerHTML = renderHud(state);
  $mbar.innerHTML = renderMobileBar(state);
  $dock.innerHTML = renderDock(state, tab);
  const on = $dock.querySelector('.on');
  if (on) $dock.scrollLeft = Math.max(0, on.offsetLeft - ($dock.clientWidth - on.offsetWidth) / 2);
  $view.innerHTML = tab === 'throne' ? renderThrone(state) : DESK_RENDERERS[tab](state);
  $view.dataset.view = tab;
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  save();
}

function act(fn, opts) {
  $error.hidden = true;
  try {
    fn();
  } catch (err) {
    console.error(err);
    $error.textContent = `That order could not be carried out: ${err.message}`;
    $error.hidden = false;
  }
  render(opts);
}

function toast(result) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<strong>${md(result.title)}</strong>${result.lines.map((l) => `<p>${md(l)}</p>`).join('')}<div class="chips">${result.chips.map(chipHtml).join('')}</div>`;
  $toasts.prepend(el);
  setTimeout(() => el.classList.add('out'), 6500);
  setTimeout(() => el.remove(), 7200);
  while ($toasts.children.length > 4) $toasts.lastChild.remove();
}

function runCommand(id, args) {
  act(() => toast(perform(state, id, args)));
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-tab]');
  if (t) {
    setTab(t.dataset.tab);
    return render({ scroll: true });
  }
  const d = e.target.closest('[data-decree]');
  if (d && state.phase === 'briefing') return act(() => decree(state, d.dataset.decree), { scroll: true });
  const c = e.target.closest('button[data-cmd]');
  if (c && !c.disabled) return runCommand(c.dataset.cmd, JSON.parse(c.dataset.args || '{}'));
  const a = e.target.closest('[data-action]');
  if (!a || a.disabled) return;
  if (a.dataset.action === 'advance' && state.phase === 'court') {
    setTab('throne');
    act(() => advance(state), { scroll: true });
  }
  if (a.dataset.action === 'new') startNew();
});

document.addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-cmd]');
  if (!sel || !sel.value) return;
  const args = { ...JSON.parse(sel.dataset.args || '{}'), [sel.dataset.arg]: sel.value };
  runCommand(sel.dataset.cmd, args);
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (tab === 'throne' && state.phase === 'briefing' && /^[1-4]$/.test(e.key)) {
    const b = $view.querySelector(`[data-decree][data-key="${e.key}"]`);
    if (b) b.click();
  } else if (state.phase === 'court' && e.key === 'Enter' && !e.target.closest('button, summary')) {
    setTab('throne');
    act(() => advance(state), { scroll: true });
  }
});

// "New reign" asks for confirmation in the page itself (browser dialogs are not available everywhere).
document.getElementById('new-game').addEventListener('click', () => {
  if (state.phase === 'ended') return startNew();
  $confirm.hidden = false;
  $confirm.querySelector('[data-confirm="no"]').focus();
});
$confirm.addEventListener('click', (e) => {
  const b = e.target.closest('[data-confirm]');
  if (!b) return;
  $confirm.hidden = true;
  if (b.dataset.confirm === 'yes') startNew();
});

function startNew() {
  $confirm.hidden = true;
  state = newGame(Date.now());
  setTab('throne');
  render({ scroll: true });
}


render();
