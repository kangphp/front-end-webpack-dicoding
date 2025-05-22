// src/views/login-view.js
import { StoryModel } from '../models/story-model.js';
import { LoginPresenter } from '../presenters/login-presenter.js';
import { loginFormTemplate } from './templates.js';
import { saveAuthToken, saveAuthUser } from '../api/story-api-config.js';

export default class LoginView {
  constructor(mainElement) {
    this.mainElement = mainElement;
  }

  async render() {
    this.mainElement.innerHTML = loginFormTemplate();
    this.form = this.mainElement.querySelector('#loginForm');
    this.emailInput = this.mainElement.querySelector('#loginEmail');
    this.passwordInput = this.mainElement.querySelector('#loginPassword');
    this.messageArea = this.mainElement.querySelector('#loginMessage');
    this.loginButton = this.mainElement.querySelector('#loginButton');
  }

  async afterRender() {
    const model = new StoryModel();
    this.presenter = new LoginPresenter(model, this);

    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = this.emailInput.value;
      const password = this.passwordInput.value;

      if (!email || !password) {
        this.showMessage('Email dan password wajib diisi.', 'error');
        return;
      }
      this.loginButton.disabled = true;
      this.loginButton.textContent = 'Memproses...';
      await this.presenter.handleLogin(email, password);
      this.loginButton.disabled = false;
      this.loginButton.textContent = 'Login';
    });
  }

  handleLoginSuccess(loginResult) {
    saveAuthToken(loginResult.token);
    saveAuthUser({ userId: loginResult.userId, name: loginResult.name });
    this.showMessage('Login berhasil! Mengarahkan ke beranda...', 'success');
    // Dispatch event agar app.js bisa update UI navigasi
    window.dispatchEvent(new CustomEvent('authChanged'));
    setTimeout(() => {
      window.location.hash = '#'; // Arahkan ke beranda
    }, 1500);
  }

  showMessage(message, type = 'info') {
    this.messageArea.textContent = message;
    this.messageArea.className = `message-area ${type}`;
    this.messageArea.style.display = 'block';
  }

  unmount() {
    console.log('LoginView unmounted');
  }
}
