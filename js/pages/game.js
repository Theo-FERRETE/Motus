// --- Instances ---
const db           = new Database();
const userManager  = new UserManager(db);
const wordManager  = new WordManager();
const scoreManager = new ScoreManager(db);

// Garde d'authentification
if (!userManager.isLoggedIn()) {
  window.location.href = 'index.html';
}

const currentUser = userManager.getCurrentUser();

// --- État global ---
let game       = null;
let difficulty = 'easy';
let revealing  = false; // bloque les touches pendant l'animation de révélation

// Normalisation des touches accentuées (clavier français)
const ACCENT_MAP = {
  'é':'e','è':'e','ê':'e','ë':'e',
  'à':'a','â':'a','ä':'a',
  'î':'i','ï':'i',
  'ô':'o','ö':'o',
  'ù':'u','û':'u','ü':'u',
  'ç':'c'
};

function normalizeKey(key) {
  return (ACCENT_MAP[key.toLowerCase()] ?? key).toUpperCase();
}

// --- Stats joueur ---
function renderStats() {
  const stats     = scoreManager.getStats(currentUser.id);
  const container = document.getElementById('player-stats');
  if (!container) return;

  container.innerHTML = stats.total === 0
    ? `<span>Aucune partie jouée</span>`
    : `
      <span>🎮 <strong>${stats.total}</strong> partie${stats.total > 1 ? 's' : ''}</span>
      <span>✅ <strong>${stats.wins}</strong> victoire${stats.wins > 1 ? 's' : ''}</span>
      <span>📈 <strong>${stats.rate}%</strong> de réussite</span>
      ${stats.best ? `<span>🏆 Meilleur : <strong>${stats.best}</strong> essai${stats.best > 1 ? 's' : ''}</span>` : ''}
    `;
}

// --- Difficulté ---
function setDifficulty(diff) {
  difficulty = diff;

  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });

  startGame();
}

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => setDifficulty(btn.dataset.diff));
});

// --- Démarrer une partie ---
function startGame() {
  const word = wordManager.getRandom(difficulty);
  game       = new Game(word, difficulty);
  revealing  = false;

  buildGrid();
  buildKeyboard();
  updateCurrentRow();
  renderStats();
  clearMessage();

  const ngZone = document.getElementById('new-game-zone');
  if (ngZone) ngZone.innerHTML = '';
}

// --- Construction de la grille ---
function buildGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML      = '';
  grid.dataset.diff   = difficulty;

  for (let row = 0; row < game.maxTries; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    rowEl.id        = `row-${row}`;

    for (let col = 0; col < game.length; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id        = `cell-${row}-${col}`;
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }
}

// --- Mise à jour de la ligne courante ---
function cellClass(col, locked, word) {
  if (col === 0)      return 'cell active-row first-letter';
  if (locked[col])    return 'cell active-row correct';
  if (word[col])      return 'cell active-row filled';
  return 'cell active-row';
}

function updateCurrentRow() {
  const row    = game.attempts.length;
  const word   = game.current;
  const locked = game.locked;

  for (let col = 0; col < game.length; col++) {
    const cell = document.getElementById(`cell-${row}-${col}`);
    if (!cell) continue;
    cell.textContent = word[col] || '';
    cell.className   = cellClass(col, locked, word);
  }
}

// --- Animation de révélation ---
function revealRow(rowIndex, word, result) {
  return new Promise(resolve => {
    result.forEach((state, col) => {
      const cell = document.getElementById(`cell-${rowIndex}-${col}`);
      if (!cell) return;

      setTimeout(() => {
        cell.style.transform  = 'scale(0.85)';
        cell.style.transition = 'transform .1s ease-in';

        setTimeout(() => {
          cell.className        = `cell ${state}`;
          cell.textContent      = word[col];
          cell.style.transform  = '';
          cell.style.transition = 'transform .1s ease-out';

          if (col === result.length - 1) setTimeout(resolve, 200);
        }, 100);

      }, col * 300);
    });
  });
}

// --- Soumission d'un essai ---
async function submitGuess() {
  if (revealing) return;

  const res = game.submit();

  if (res.error === 'short') {
    const rowEl = document.getElementById(`row-${game.attempts.length}`);
    rowEl.classList.add('shake');
    setTimeout(() => rowEl.classList.remove('shake'), 400);
    showMessage(res.message, 'info');
    setTimeout(clearMessage, 1800);
    return;
  }

  if (res.error) return;

  const attempt  = game.attempts[game.attempts.length - 1];
  const rowIndex = game.attempts.length - 1;

  revealing = true;
  await revealRow(rowIndex, attempt.word, attempt.result);
  revealing = false;

  updateKeyboard();

  if (res.status === 'won') {
    const count = game.attempts.length;
    showMessage(`🎉 Bravo ! Trouvé en ${count} essai${count > 1 ? 's' : ''} !`, 'win');
    saveScore(true);
    showNewGame();
  } else if (res.status === 'lost') {
    showMessage(`😔 Raté ! Le mot était : ${game.secret}`, 'lose');
    saveScore(false);
    showNewGame(true);
  } else {
    updateCurrentRow();
  }
}

// --- Gestion des touches ---
function handleKey(key) {
  if (revealing || !game || game.status !== 'playing') return;

  const normalized = normalizeKey(key);

  if (normalized === 'BACKSPACE') {
    if (game.backspace()) updateCurrentRow();

  } else if (normalized === 'ENTER') {
    submitGuess();

  } else if (/^[A-Z]$/.test(normalized)) {
    const col = game.addLetter(normalized);
    if (col !== -1) {
      const row  = game.attempts.length;
      const cell = document.getElementById(`cell-${row}-${col}`);
      if (cell) {
        cell.classList.remove('pop');
        void cell.offsetWidth; // reflow pour relancer l'animation
        cell.classList.add('pop');
      }
      updateCurrentRow();
    }
  }
}

// Clavier physique
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  e.preventDefault();
  handleKey(e.key);
});

// --- Clavier virtuel ---
function buildKeyboard() {
  const keyboard = document.getElementById('keyboard');
  const rows = [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L','M'],
    ['W','X','C','V','B','N','←','↵']
  ];

  keyboard.innerHTML = rows.map(row => `
    <div class="keyboard-row">
      ${row.map(k => `
        <button
          class="key ${k === '←' || k === '↵' ? 'wide' : ''}"
          id="key-${k}"
          data-key="${k}"
        >${k}</button>
      `).join('')}
    </div>
  `).join('');
}

document.getElementById('keyboard').addEventListener('click', e => {
  const btn = e.target.closest('.key');
  if (!btn) return;
  const k = btn.dataset.key;
  if (k === '←') handleKey('BACKSPACE');
  else if (k === '↵') handleKey('ENTER');
  else handleKey(k);
});

function updateKeyboard() {
  const states = game.keyStates;
  Object.entries(states).forEach(([letter, state]) => {
    const key = document.getElementById(`key-${letter}`);
    if (key) key.className = `key ${state}`;
  });
}

// --- Messages ---
function showMessage(text, type) {
  const bar = document.getElementById('message-bar');
  bar.innerHTML = `<span class="message ${type}">${text}</span>`;
}

function clearMessage() {
  document.getElementById('message-bar').innerHTML = '';
}

// --- Score ---
function saveScore(won) {
  scoreManager.save({
    userId   : currentUser.id,
    username : currentUser.username,
    word     : game.secret,
    difficulty,
    attempts : game.attempts.length,
    won
  });
}

// --- Fin de partie ---
function showNewGame(showWord = false) {
  const zone = document.getElementById('new-game-zone');
  zone.innerHTML = `
    ${showWord ? `<p class="secret-word">Mot secret : <strong>${game.secret}</strong></p>` : ''}
    <button class="btn btn-accent" id="btn-new-game">🔄 Nouvelle partie</button>
  `;
  document.getElementById('btn-new-game').addEventListener('click', startGame);
}

// --- Init ---
renderStats();
startGame();
