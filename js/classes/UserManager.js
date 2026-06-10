class UserManager {
  #db;

  constructor(db) {
    this.#db = db;
  }

  // Hash basique côté client (en prod: bcrypt serveur)
  #hash(password) {
    let h = 5381;
    for (let i = 0; i < password.length; i++) {
      h = Math.imul(h, 33) ^ password.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
  }

  register(username, email, password) {
    const users = this.#db.getList('users');

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase()))
      throw new Error('Ce pseudo est déjà pris.');

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase()))
      throw new Error('Cet email est déjà utilisé.');

    const user = {
      id: Date.now().toString(36),
      username,
      email,
      hash: this.#hash(password),
      createdAt: Date.now()
    };

    this.#db.push('users', user);
    return { id: user.id, username, email };
  }

  login(username, password) {
    const users = this.#db.getList('users');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || user.hash !== this.#hash(password))
      throw new Error('Identifiants invalides.');

    const session = { id: user.id, username: user.username, email: user.email };
    this.#db.set('session', session);
    return session;
  }

  logout() {
    this.#db.remove('session');
  }

  getCurrentUser() {
    return this.#db.get('session');
  }

  isLoggedIn() {
    return !!this.getCurrentUser();
  }
}
