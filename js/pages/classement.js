class ClassementPage {
  static #DIFF_LABELS = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

  #db            = new Database();
  #userManager   = new UserManager(this.#db);
  #scoreManager  = new ScoreManager(this.#db);
  #currentFilter = 'all';

  constructor() {
    if (!this.#userManager.isLoggedIn()) {
      window.location.href = 'index.html';
      return;
    }
    this.#init();
  }

  #init() {
    const user   = this.#userManager.getCurrentUser();
    const userEl = document.getElementById('header-username');
    if (userEl && user) userEl.innerHTML = `Bonjour, <strong>${user.username}</strong>`;

    document.getElementById('btn-logout').addEventListener('click', () => {
      this.#userManager.logout();
      window.location.href = 'index.html';
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.#currentFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.filter === this.#currentFilter)
        );
        this.#renderScores();
      });
    });

    this.#renderScores();
  }

  // --- Rendu du tableau ---
  #renderScores() {
    const scores   = this.#scoreManager.getTop(this.#currentFilter);
    const tbody    = document.getElementById('scores-body');
    const noScores = document.getElementById('no-scores');
    const table    = document.querySelector('.scores-table');

    if (scores.length === 0) {
      table.style.display    = 'none';
      noScores.style.display = '';
      return;
    }

    table.style.display    = '';
    noScores.style.display = 'none';

    tbody.innerHTML = scores.map((score, index) => {
      const rank      = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-n';
      const date      = new Date(score.timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const label = ClassementPage.#DIFF_LABELS[score.difficulty] ?? score.difficulty;

      return `
        <tr>
          <td><span class="rank-badge ${rankClass}">${rank}</span></td>
          <td><strong>${score.username}</strong></td>
          <td class="score-word">${score.word}</td>
          <td><span class="diff-pill ${score.difficulty}">${label}</span></td>
          <td class="score-attempts">${score.attempts} essai${score.attempts > 1 ? 's' : ''}</td>
          <td class="score-date">${date}</td>
        </tr>
      `;
    }).join('');
  }
}

new ClassementPage();
