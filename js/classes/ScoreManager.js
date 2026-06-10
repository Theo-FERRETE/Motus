class ScoreManager {
  #db;

  constructor(db) {
    this.#db = db;
  }

  save({ userId, username, word, difficulty, attempts, won }) {
    return this.#db.push('scores', {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      userId,
      username,
      word,
      difficulty,
      attempts,
      won,
      timestamp: Date.now()
    });
  }

  // Classement : victoires uniquement, triées par nombre d'essais
  getTop(difficulty = 'all', limit = 50) {
    let scores = this.#db.getList('scores').filter(s => s.won);

    if (difficulty !== 'all') {
      scores = scores.filter(s => s.difficulty === difficulty);
    }

    return scores
      .sort((a, b) => a.attempts - b.attempts || b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getStats(userId) {
    const all  = this.#db.getList('scores').filter(s => s.userId === userId);
    const wins = all.filter(s => s.won);

    return {
      total : all.length,
      wins  : wins.length,
      rate  : all.length ? Math.round((wins.length / all.length) * 100) : 0,
      best  : wins.length ? Math.min(...wins.map(s => s.attempts)) : null
    };
  }
}
