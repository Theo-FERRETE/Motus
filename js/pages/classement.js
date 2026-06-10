// --- Instances ---
const db           = new Database();
const userManager  = new UserManager(db);
const scoreManager = new ScoreManager(db);

// Garde d'authentification
if (!userManager.isLoggedIn()) {
  window.location.href = 'index.html';
}

// --- État ---
let currentFilter = 'all';

const DIFF_LABELS = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };

// --- Filtres ---
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === currentFilter)
    );
    renderScores();
  });
});

// --- Rendu du tableau ---
function renderScores() {
  const scores  = scoreManager.getTop(currentFilter);
  const tbody   = document.getElementById('scores-body');
  const noScores = document.getElementById('no-scores');
  const table   = document.querySelector('.scores-table');

  if (scores.length === 0) {
    table.style.display   = 'none';
    noScores.style.display = '';
    return;
  }

  table.style.display   = '';
  noScores.style.display = 'none';

  tbody.innerHTML = scores.map((score, index) => {
    const rank     = index + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-n';
    const date     = new Date(score.timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return `
      <tr>
        <td><span class="rank-badge ${rankClass}">${rank}</span></td>
        <td><strong>${score.username}</strong></td>
        <td class="score-word">${score.word}</td>
        <td><span class="diff-pill ${score.difficulty}">${DIFF_LABELS[score.difficulty] ?? score.difficulty}</span></td>
        <td class="score-attempts">${score.attempts} essai${score.attempts > 1 ? 's' : ''}</td>
        <td class="score-date">${date}</td>
      </tr>
    `;
  }).join('');
}

// --- Init ---
renderScores();
