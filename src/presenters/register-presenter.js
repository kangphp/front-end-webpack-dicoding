// src/presenters/register-presenter.js
export class RegisterPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async handleRegister(name, email, password) {
    try {
      this.view.showMessage('Mencoba mendaftar...', 'info');
      // Panggil metode register pada model
      const response = await this.model.register(name, email, password);

      if (response.error) { // Seharusnya sudah ditangani oleh model, tapi sebagai fallback
        this.view.showMessage(response.message || 'Registrasi gagal.', 'error');
      } else {
        // API mengembalikan {"error": false, "message": "User Created"}
        this.view.handleRegisterSuccess(response.message);
      }
    } catch (error) {
      // Error dari model (misalnya, fetch gagal atau API mengembalikan error)
      this.view.showMessage(error.message || 'Registrasi gagal. Silakan coba lagi.', 'error');
    }
  }
}
