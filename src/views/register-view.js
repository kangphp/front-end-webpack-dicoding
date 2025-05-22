// src/views/register-view.js
import { StoryModel } from '../models/story-model.js';
import { RegisterPresenter } from '../presenters/register-presenter.js';
import { registerFormTemplate } from './templates.js'; // Pastikan template ini sudah ada

export default class RegisterView {
  constructor(mainElement) {
    this.mainElement = mainElement;
  }

  async render() {
    this.mainElement.innerHTML = registerFormTemplate(); // Gunakan template dari templates.js
    this.form = this.mainElement.querySelector('#registerForm');
    this.nameInput = this.mainElement.querySelector('#registerName');
    this.emailInput = this.mainElement.querySelector('#registerEmail');
    this.passwordInput = this.mainElement.querySelector('#registerPassword');
    this.messageArea = this.mainElement.querySelector('#registerMessage');
    this.registerButton = this.mainElement.querySelector('#registerButton');
  }

  async afterRender() {
    const model = new StoryModel(); // Model yang sama digunakan untuk operasi API
    this.presenter = new RegisterPresenter(model, this);

    this.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = this.nameInput.value;
      const email = this.emailInput.value;
      const password = this.passwordInput.value;

      // Validasi dasar di sisi klien
      if (!name || !email || !password) {
        this.showMessage('Nama, email, dan password wajib diisi.', 'error');
        return;
      }
      if (password.length < 8) {
        this.showMessage('Password minimal harus 8 karakter.', 'error');
        return;
      }

      this.registerButton.disabled = true;
      this.registerButton.textContent = 'Memproses...';
      await this.presenter.handleRegister(name, email, password);
      this.registerButton.disabled = false;
      this.registerButton.textContent = 'Daftar';
    });
  }

  handleRegisterSuccess(message) {
    this.showMessage(message + ' Anda akan diarahkan ke halaman login.', 'success');
    setTimeout(() => {
      window.location.hash = '#login'; // Arahkan ke halaman login setelah sukses registrasi
    }, 2500); // Tunggu 2.5 detik sebelum redirect
  }

  showMessage(message, type = 'info') { // type bisa 'info', 'success', 'error'
    this.messageArea.textContent = message;
    this.messageArea.className = `message-area ${type}`; // Untuk styling CSS
    this.messageArea.style.display = 'block';
  }

  unmount() {
    // Bersihkan event listener atau sumber daya lain jika ada
    console.log('RegisterView unmounted');
  }
}
