class AuthPage {
  #db          = new Database();
  #userManager = new UserManager(this.#db);

  constructor() {
    if (this.#userManager.isLoggedIn()) {
      window.location.href = 'game.html';
      return;
    }
    this.#init();
  }

  #init() {
    document.getElementById('tab-login').addEventListener('click',    () => this.#switchTab('login'));
    document.getElementById('tab-register').addEventListener('click', () => this.#switchTab('register'));
    document.getElementById('btn-login').addEventListener('click',    () => this.#handleLogin());
    document.getElementById('btn-register').addEventListener('click', () => this.#handleRegister());

    document.querySelectorAll('#form-login input').forEach(input =>
      input.addEventListener('keydown', e => { if (e.key === 'Enter') this.#handleLogin(); })
    );
    document.querySelectorAll('#form-register input').forEach(input =>
      input.addEventListener('keydown', e => { if (e.key === 'Enter') this.#handleRegister(); })
    );
  }

  // --- Onglets ---
  #switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('form-login').style.display    = isLogin ? '' : 'none';
    document.getElementById('form-register').style.display = isLogin ? 'none' : '';
    this.#clearAlert();
  }

  // --- Alertes ---
  #showAlert(message, type = 'error') {
    document.getElementById('alert-box').innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => this.#clearAlert(), 4000);
  }

  #clearAlert() {
    document.getElementById('alert-box').innerHTML = '';
  }

  // --- Validation champ ---
  #validateField(inputId, errorId, rule) {
    const input   = document.getElementById(inputId);
    const error   = document.getElementById(errorId);
    const message = rule(input.value);
    input.classList.toggle('is-error', !!message);
    error.textContent = message ?? '';
    return !message;
  }

  // --- Connexion ---
  #handleLogin() {
    let valid = true;
    valid &= this.#validateField('login-username', 'login-username-err',
      v => !v.trim() ? 'Champ requis.' : null);
    valid &= this.#validateField('login-password', 'login-password-err',
      v => !v ? 'Champ requis.' : null);
    if (!valid) return;

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      this.#userManager.login(username, password);
      window.location.href = 'game.html';
    } catch (e) {
      this.#showAlert(e.message);
    }
  }

  // --- Inscription ---
  #handleRegister() {
    let valid = true;

    valid &= this.#validateField('reg-username', 'reg-username-err', v => {
      if (!v.trim())          return 'Champ requis.';
      if (v.length < 3)       return 'Minimum 3 caractères.';
      if (!/^[\w]+$/.test(v)) return 'Lettres, chiffres et _ uniquement.';
      return null;
    });
    valid &= this.#validateField('reg-email', 'reg-email-err', v => {
      if (!v.trim())                              return 'Champ requis.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email invalide.';
      return null;
    });

    const password = document.getElementById('reg-password').value;

    valid &= this.#validateField('reg-password', 'reg-password-err', v => {
      if (!v)           return 'Champ requis.';
      if (v.length < 8) return 'Minimum 8 caractères.';
      return null;
    });
    valid &= this.#validateField('reg-confirm', 'reg-confirm-err',
      v => v !== password ? 'Les mots de passe ne correspondent pas.' : null);

    if (!valid) return;

    try {
      this.#userManager.register(
        document.getElementById('reg-username').value.trim(),
        document.getElementById('reg-email').value.trim(),
        password
      );
      this.#showAlert('Compte créé avec succès ! Connectez-vous.', 'success');
      this.#switchTab('login');
    } catch (e) {
      this.#showAlert(e.message);
    }
  }
}

new AuthPage();
