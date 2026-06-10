// --- Instances ---
const db          = new Database();
const userManager = new UserManager(db);

// Redirection si déjà connecté
if (userManager.isLoggedIn()) {
  window.location.href = 'game.html';
}

// --- DOM ---
const alertBox    = document.getElementById('alert-box');
const tabLogin    = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin   = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

// --- Onglets ---
function switchTab(tab) {
  const isLogin = tab === 'login';

  tabLogin.classList.toggle('active', isLogin);
  tabRegister.classList.toggle('active', !isLogin);
  formLogin.style.display    = isLogin ? '' : 'none';
  formRegister.style.display = isLogin ? 'none' : '';

  clearAlert();
}

tabLogin.addEventListener('click', () => switchTab('login'));
tabRegister.addEventListener('click', () => switchTab('register'));

// --- Alertes ---
function showAlert(message, type = 'error') {
  alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(clearAlert, 4000);
}

function clearAlert() {
  alertBox.innerHTML = '';
}

// --- Validation champ ---
function validateField(inputId, errorId, rule) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  const message = rule(input.value);

  input.classList.toggle('is-error', !!message);
  error.textContent = message ?? '';

  return !message;
}

// --- Connexion ---
function handleLogin() {
  let valid = true;

  valid &= validateField('login-username', 'login-username-err',
    v => !v.trim() ? 'Champ requis.' : null);

  valid &= validateField('login-password', 'login-password-err',
    v => !v ? 'Champ requis.' : null);

  if (!valid) return;

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    userManager.login(username, password);
    window.location.href = 'game.html';
  } catch (e) {
    showAlert(e.message);
  }
}

document.getElementById('btn-login').addEventListener('click', handleLogin);

document.querySelectorAll('#form-login input').forEach(input =>
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); })
);

// --- Inscription ---
function handleRegister() {
  let valid = true;

  valid &= validateField('reg-username', 'reg-username-err', v => {
    if (!v.trim())           return 'Champ requis.';
    if (v.length < 3)        return 'Minimum 3 caractères.';
    if (!/^[\w]+$/.test(v))  return 'Lettres, chiffres et _ uniquement.';
    return null;
  });

  valid &= validateField('reg-email', 'reg-email-err', v => {
    if (!v.trim())                               return 'Champ requis.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email invalide.';
    return null;
  });

  const password = document.getElementById('reg-password').value;

  valid &= validateField('reg-password', 'reg-password-err', v => {
    if (!v)         return 'Champ requis.';
    if (v.length < 8) return 'Minimum 8 caractères.';
    return null;
  });

  valid &= validateField('reg-confirm', 'reg-confirm-err',
    v => v !== password ? 'Les mots de passe ne correspondent pas.' : null);

  if (!valid) return;

  try {
    userManager.register(
      document.getElementById('reg-username').value.trim(),
      document.getElementById('reg-email').value.trim(),
      password
    );
    showAlert('Compte créé avec succès ! Connectez-vous.', 'success');
    switchTab('login');
  } catch (e) {
    showAlert(e.message);
  }
}

document.getElementById('btn-register').addEventListener('click', handleRegister);

document.querySelectorAll('#form-register input').forEach(input =>
  input.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); })
);
