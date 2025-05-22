// src/views/templates.js

// Template untuk satu item cerita dalam daftar
export const storyItemTemplate = (story) => `
  <article class="story-item" id="story-${story.id}">
    <figure class="story-figure">
      <img src="${story.photoUrl}" alt="Gambar untuk cerita '${story.description.substring(0, 30)}...' oleh ${story.name}" class="story-image">
      <figcaption class="story-user">Oleh: ${story.name || 'Pengguna Anonim'}</figcaption>
    </figure>
    <div class="story-info">
      <p class="story-description">${story.description}</p>
      <p class="story-date">Diunggah: ${new Date(story.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${story.lat && story.lon ? `<div id="map-${story.id}" class="story-item-map" style="height: 150px; width: 100%; margin-top: 10px;" data-lat="${story.lat}" data-lon="${story.lon}" data-popup="${story.name}: ${story.description.substring(0,20)}...">Memuat peta...</div>` : '<p class="no-location">Tidak ada data lokasi.</p>'}
      <!-- Kriteria Wajib 3: Minimal satu data gambar dan tiga data teks -->
    </div>
  </article>
`;

// Template untuk halaman daftar cerita secara keseluruhan
export const storyListContainerTemplate = () => `
  <section class="story-list-page">
    <h2>Semua Cerita</h2>
    <div id="storyList" class="story-list-container">
      <!-- Item cerita akan dimasukkan di sini -->
    </div>
    <div id="loadingIndicator" class="loading" style="display:none;">Memuat cerita...</div>
    <div id="errorMessage" class="error-message" style="display:none;"></div>
    <!-- Kriteria Wajib 3: Peta digital untuk menunjukkan lokasi data (bisa satu peta besar di sini) -->
    <h3>Peta Lokasi Cerita</h3>
    <div id="mainStoryMap" style="height: 400px; width: 100%; margin-top: 20px; background-color: #eee;">
        Memuat peta utama...
    </div>
  </section>
`;

// Template untuk formulir tambah cerita baru
export const addStoryFormTemplate = () => `
  <section class="add-story-page">
    <h2>Bagikan Cerita Baru Anda</h2>
    <form id="addStoryForm" novalidate>
      <div class="form-group">
        <label for="storyDescription">Deskripsi Cerita Anda:</label>
        <textarea id="storyDescription" name="description" rows="4" required aria-describedby="descriptionError"></textarea>
        <div id="descriptionError" class="error-feedback"></div>
      </div>
      
      <div class="form-group">
        <label for="storyPhotoSource">Sumber Foto:</label>
        <select id="storyPhotoSource" name="photoSource">
            <option value="file">Unggah File</option>
            <option value="camera">Gunakan Kamera</option>
        </select>
      </div>

      <div class="form-group" id="fileUploadGroup">
        <label for="storyPhotoFile">Unggah Foto (Max 1MB, JPG/PNG):</label>
        <input type="file" id="storyPhotoFile" name="photoFile" accept="image/jpeg, image/png">
      </div>
      
      <div class="form-group" id="cameraGroup" style="display:none;">
        <label>Ambil Foto dengan Kamera:</label>
        <video id="cameraPreview" playsinline autoplay muted style="width: 100%; max-width: 320px; border: 1px solid #ccc;"></video>
        <button type="button" id="snapPhotoButton" aria-label="Ambil Foto dari Kamera">Ambil Foto</button>
        <canvas id="photoCanvas" style="display:none;"></canvas>
        <img id="capturedImagePreview" src="#" alt="Pratinjau gambar yang diambil" style="display:none; max-width: 320px; margin-top: 10px;" />
      </div>
      <div id="photoError" class="error-feedback"></div>
      
      <div class="form-group">
        <label>Pilih Lokasi (klik pada peta):</label>
        <div id="mapPickerContainer" style="height: 300px; width: 100%; margin-bottom: 10px; background-color: #eee;">
            Memuat peta untuk pemilihan lokasi...
        </div>
        <input type="hidden" id="storyLatitude" name="lat">
        <input type="hidden" id="storyLongitude" name="lon">
        <p>Lokasi terpilih: <span id="selectedLocationText">Belum ada</span></p>
      </div>
      
      <button type="submit" id="submitStoryButton">Bagikan Cerita</button>
      <div id="addStoryMessage" class="message-area" style="margin-top:15px;"></div>
    </form>
  </section>
`;

export const loginFormTemplate = () => `
  <section class="login-page">
    <h2>Login Akun</h2>
    <form id="loginForm" novalidate>
      <div class="form-group">
        <label for="loginEmail">Email:</label>
        <input type="email" id="loginEmail" name="email" required>
      </div>
      <div class="form-group">
        <label for="loginPassword">Password:</label>
        <input type="password" id="loginPassword" name="password" required>
      </div>
      <button type="submit" id="loginButton">Login</button>
      <div id="loginMessage" class="message-area" style="margin-top:15px;"></div>
    </form>
    <p style="margin-top: 15px;">Belum punya akun? <a href="#register">Daftar di sini</a></p>
  </section>
`;

export const registerFormTemplate = () => `
  <section class="register-page">
    <h2>Daftar Akun Baru</h2>
    <form id="registerForm" novalidate>
      <div class="form-group">
        <label for="registerName">Nama:</label>
        <input type="text" id="registerName" name="name" required>
      </div>
      <div class="form-group">
        <label for="registerEmail">Email:</label>
        <input type="email" id="registerEmail" name="email" required>
      </div>
      <div class="form-group">
        <label for="registerPassword">Password (min. 8 karakter):</label>
        <input type="password" id="registerPassword" name="password" required minlength="8">
      </div>
      <button type="submit" id="registerButton">Daftar</button>
      <div id="registerMessage" class="message-area" style="margin-top:15px;"></div>
    </form>
    <p style="margin-top: 15px;">Sudah punya akun? <a href="#login">Login di sini</a></p>
  </section>
`;
