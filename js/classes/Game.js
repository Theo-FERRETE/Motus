class Game {
  #secret;
  #length;
  #keyStates = {};
  #locked = []; // positions verrouillées (lettre correcte trouvée)

  constructor(secret, difficulty = 'easy') {
    this.#secret    = secret.toUpperCase();
    this.difficulty = difficulty;
    this.#length    = this.#secret.length;
    this.maxTries   = 6;
    this.attempts   = []; // [{ word, result }]
    this.#locked    = Array(this.#length).fill(false);
    this.#locked[0] = true; // première lettre toujours verrouillée
    this.current    = Array(this.#length).fill('');
    this.current[0] = this.#secret[0];
    this.status     = 'playing'; // 'playing' | 'won' | 'lost'
  }

  get secret()    { return this.#secret; }
  get length()    { return this.#length; }
  get keyStates() { return { ...this.#keyStates }; }
  get locked()    { return [...this.#locked]; }

  // Retourne l'index rempli, ou -1 si impossible
  addLetter(letter) {
    if (this.status !== 'playing') return -1;
    const idx = this.current.findIndex((c, i) => !this.#locked[i] && c === '');
    if (idx === -1) return -1;
    this.current[idx] = letter.toUpperCase();
    return idx;
  }

  backspace() {
    if (this.status !== 'playing') return false;
    let idx = -1;
    for (let i = this.#length - 1; i >= 0; i--) {
      if (!this.#locked[i] && this.current[i] !== '') { idx = i; break; }
    }
    if (idx === -1) return false;
    this.current[idx] = '';
    return true;
  }

  submit() {
    if (this.status !== 'playing') return { error: 'over' };
    if (this.current.some(c => c === ''))
      return { error: 'short', message: `Mot de ${this.#length} lettres requis.` };

    const word   = this.current.join('');
    const result = this.#evaluate(word);
    this.attempts.push({ word, result });
    this.#updateKeyStates(word, result);

    if (word === this.#secret) {
      this.status = 'won';
    } else if (this.attempts.length >= this.maxTries) {
      this.status = 'lost';
    }

    // Verrouiller les nouvelles lettres correctes
    result.forEach((state, i) => { if (state === 'correct') this.#locked[i] = true; });
    // Réinitialiser la ligne suivante avec les positions verrouillées
    this.current = this.#locked.map((locked, i) => locked ? this.#secret[i] : '');
    return { result, status: this.status };
  }

  // Algorithme de vérification (2 passes)
  #evaluate(guess) {
    const result      = Array(this.#length).fill('absent');
    const secretChars = [...this.#secret];
    const guessChars  = [...guess];

    // Passe 1 : lettres bien placées
    for (let i = 0; i < this.#length; i++) {
      if (guessChars[i] === secretChars[i]) {
        result[i]      = 'correct';
        secretChars[i] = null;
        guessChars[i]  = null;
      }
    }

    // Passe 2 : lettres présentes mais mal placées
    for (let i = 0; i < this.#length; i++) {
      if (guessChars[i] !== null) {
        const idx = secretChars.indexOf(guessChars[i]);
        if (idx !== -1) {
          result[i]       = 'misplaced';
          secretChars[idx] = null;
        }
      }
    }

    return result;
  }

  // Mise à jour de l'état des touches (priorité : correct > misplaced > absent)
  #updateKeyStates(word, result) {
    const priority = { correct: 3, misplaced: 2, absent: 1 };
    for (let i = 0; i < word.length; i++) {
      const letter  = word[i];
      const state   = result[i];
      const current = this.#keyStates[letter];
      if ((priority[state] ?? 0) > (priority[current] ?? 0)) {
        this.#keyStates[letter] = state;
      }
    }
  }
}
