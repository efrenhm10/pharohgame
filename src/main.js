// Browser entry point: wires the engine to the DOM and persists the reign.
import { newGame, decree, advance } from './engine/game.js';
import { renderMain, renderSidebar, renderDate } from './ui/render.js';

const SAVE_KEY = 'horus-in-the-flesh/save-v1';
const $main = document.getElementById('briefing');
const $side = document.getElementById('sidebar');
const $date = document.getElementById('date');
const $confirm = document.getElementById('confirm-new');
const $error = document.getElementById('error');

let state = load() || newGame(Date.now());

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* private mode or storage blocked: the reign simply isn't saved */
  }
}

function render({ scroll = true } = {}) {
  $date.innerHTML = renderDate(state);
  $main.innerHTML = renderMain(state);
  $side.innerHTML = renderSidebar(state);
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  const focusable = $main.querySelector('[data-action], [data-decree]');
  if (focusable && state.phase !== 'briefing') focusable.focus({ preventScroll: true });
  save();
}

function act(fn) {
  $error.hidden = true;
  try {
    fn();
  } catch (err) {
    console.error(err);
    $error.textContent = `Something went wrong: ${err.message}. Your reign is saved. Reload the page to continue.`;
    $error.hidden = false;
  }
  render();
}

document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-decree]');
  if (d && state.phase === 'briefing') return act(() => decree(state, d.dataset.decree));
  const a = e.target.closest('[data-action]');
  if (!a) return;
  if (a.dataset.action === 'advance' && state.phase === 'outcome') act(() => advance(state));
  if (a.dataset.action === 'new') startNew();
});

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (state.phase === 'briefing' && /^[1-4]$/.test(e.key)) {
    const b = $main.querySelector(`[data-decree][data-key="${e.key}"]`);
    if (b) b.click();
  } else if (state.phase === 'outcome' && e.key === 'Enter' && !e.target.closest('button')) {
    act(() => advance(state));
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
  render();
}

render({ scroll: false });
