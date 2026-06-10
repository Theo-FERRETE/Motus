class GamePage {
  static #ACCENT_MAP = {
    'é':'e','è':'e','ê':'e','ë':'e',
    'à':'a','â':'a','ä':'a',
    'î':'i','ï':'i',
    'ô':'o','ö':'o',
    'ù':'u','û':'u','ü':'u',
    'ç':'c'
  };

  #db = new Database();
  #userManager = new UserManager(this.#db);
  #wordManager = new WordManager();
  #scoreManager = new ScoreManager(this.#db);
  #currentUser = null;

  #game = null;
  #difficulty = 'easy';
  #revealing = false;

  constructor() {
    if (!this.#userManager.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }
    this.#currentUser = this.#userManager.getCurrentUser();
    this.#init();
  }

  #init() {
    const userEl = document.getElementById('header-username');
    if (userEl) userEl.innerHTML = `Bonjour, <strong>${this.#currentUser.username}</strong>`;

    document.getElementById('btn-logout').addEventListener('click', () => {
      this.#userManager.logout();
      window.location.href = 'index.html';
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => this.#setDifficulty(btn.dataset.diff));
    });

    document.getElementById('keyboard').addEventListener('click', e => {
      const btn = e.target.closest('.key');
      if (!btn) return;
      const k = btn.dataset.key;
      if (k === '←')      this.#handleKey('BACKSPACE');
      else if (k === '↵') this.#handleKey('ENTER');
      else                 this.#handleKey(k);
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      this.#handleKey(e.key);
    });

    this.#renderStats();
    this.#startGame();
  }

  #normalizeKey(key) {
    return (GamePage.#ACCENT_MAP[key.toLowerCase()] ?? key).toUpperCase();
  }

  #renderStats() {
    const stats = this.#scoreManager.getStats(this.#currentUser.id);
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

  #setDifficulty(diff) {
    this.#difficulty = diff;
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === diff);
    });
    this.#startGame();
  }

  #startGame() {
    const word = this.#wordManager.getRandom(this.#difficulty);
    this.#game = new Game(word, this.#difficulty);
    this.#revealing = false;

    this.#buildGrid();
    this.#buildKeyboard();
    this.#updateCurrentRow();
    this.#renderStats();
    this.#clearMessage();

    const ngZone = document.getElementById('new-game-zone');
    if (ngZone) ngZone.innerHTML = '';
  }

  #buildGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    grid.dataset.diff = this.#difficulty;

    for (let row = 0; row < this.#game.maxTries; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'grid-row';
      rowEl.id = `row-${row}`;

      for (let col = 0; col < this.#game.length; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.id = `cell-${row}-${col}`;
        rowEl.appendChild(cell);
      }
      grid.appendChild(rowEl);
    }
  }

  #cellClass(col, locked, word) {
    if (col === 0)   return 'cell active-row first-letter';
    if (locked[col]) return 'cell active-row correct';
    if (word[col])   return 'cell active-row filled';
    return 'cell active-row';
  }

  #updateCurrentRow() {
    const row = this.#game.attempts.length;
    const word = this.#game.current;
    const locked = this.#game.locked;

    for (let col = 0; col < this.#game.length; col++) {
      const cell = document.getElementById(`cell-${row}-${col}`);
      if (!cell) continue;
      cell.textContent = word[col] || '';
      cell.className = this.#cellClass(col, locked, word);
    }
  }

  // Chaque cellule se réduit puis révèle sa couleur avec un décalage par colonne
  #revealRow(rowIndex, word, result) {
    return new Promise(resolve => {
      result.forEach((state, col) => {
        const cell = document.getElementById(`cell-${rowIndex}-${col}`);
        if (!cell) return;

        setTimeout(() => {
          cell.style.transform = 'scale(0.85)';
          cell.style.transition = 'transform .1s ease-in';

          setTimeout(() => {
            cell.className = `cell ${state}`;
            cell.textContent = word[col];
            cell.style.transform = '';
            cell.style.transition = 'transform .1s ease-out';
            if (col === result.length - 1) setTimeout(resolve, 200);
          }, 100);
        }, col * 300);
      });
    });
  }

  async #submitGuess() {
    if (this.#revealing) return;

    const res = this.#game.submit();

    if (res.error === 'short') {
      const rowEl = document.getElementById(`row-${this.#game.attempts.length}`);
      rowEl.classList.add('shake');
      setTimeout(() => rowEl.classList.remove('shake'), 400);
      this.#showMessage(res.message, 'info');
      setTimeout(() => this.#clearMessage(), 1800);
      return;
    }

    if (res.error) return;

    const attempt = this.#game.attempts[this.#game.attempts.length - 1];
    const rowIndex = this.#game.attempts.length - 1;

    this.#revealing = true;
    await this.#revealRow(rowIndex, attempt.word, attempt.result);
    this.#revealing = false;

    this.#updateKeyboard();

    if (res.status === 'won') {
      const count = this.#game.attempts.length;
      this.#showMessage(`🎉 Bravo ! Trouvé en ${count} essai${count > 1 ? 's' : ''} !`, 'win');
      this.#saveScore(true);
      this.#showNewGame();
    } else if (res.status === 'lost') {
      this.#showMessage(`😔 Raté ! Le mot était : ${this.#game.secret}`, 'lose');
      this.#saveScore(false);
      this.#showNewGame(true);
    } else {
      this.#updateCurrentRow();
    }
  }

  #handleKey(key) {
    if (this.#revealing || !this.#game || this.#game.status !== 'playing') return;

    const normalized = this.#normalizeKey(key);

    if (normalized === 'BACKSPACE') {
      if (this.#game.backspace()) this.#updateCurrentRow();

    } else if (normalized === 'ENTER') {
      this.#submitGuess();

    } else if (/^[A-Z]$/.test(normalized)) {
      const col = this.#game.addLetter(normalized);
      if (col !== -1) {
        const row = this.#game.attempts.length;
        const cell = document.getElementById(`cell-${row}-${col}`);
        if (cell) {
          cell.classList.remove('pop');
          void cell.offsetWidth; // reflow pour relancer l'animation
          cell.classList.add('pop');
        }
        this.#updateCurrentRow();
      }
    }
  }

  #buildKeyboard() {
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

  #updateKeyboard() {
    const states = this.#game.keyStates;
    Object.entries(states).forEach(([letter, state]) => {
      const key = document.getElementById(`key-${letter}`);
      if (key) key.className = `key ${state}`;
    });
  }

  #showMessage(text, type) {
    document.getElementById('message-bar').innerHTML = `<span class="message ${type}">${text}</span>`;
  }

  #clearMessage() {
    document.getElementById('message-bar').innerHTML = '';
  }

  #saveScore(won) {
    this.#scoreManager.save({
      userId: this.#currentUser.id,
      username: this.#currentUser.username,
      word: this.#game.secret,
      difficulty: this.#difficulty,
      attempts: this.#game.attempts.length,
      won
    });
  }

  #showNewGame(showWord = false) {
    const zone = document.getElementById('new-game-zone');
    zone.innerHTML = `
      ${showWord ? `<p class="secret-word">Mot secret : <strong>${this.#game.secret}</strong></p>` : ''}
      <button class="btn btn-accent" id="btn-new-game">🔄 Nouvelle partie</button>
    `;
    document.getElementById('btn-new-game').addEventListener('click', () => this.#startGame());
  }
}

new GamePage();
