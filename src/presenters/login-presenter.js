// src/presenters/login-presenter.js
export class LoginPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async handleLogin(email, password) {
    try {
      this.view.showMessage('Mencoba login...', 'info');
      const response = await this.model.login(email, password); // { error, message, loginResult }
      if (response.error) { // Seharusnya sudah ditangani oleh model, tapi double check
        this.view.showMessage(response.message, 'error');
      } else {
        this.view.handleLoginSuccess(response.loginResult);
      }
    } catch (error) {
      this.view.showMessage(error.message || 'Login gagal. Periksa kembali email dan password Anda.', 'error');
    }
  }
}
