// src/router/index.js
const Router = {
  init(mainElement, routesConfig) {
    this.mainElement = mainElement;
    this.routes = routesConfig;
    this.currentView = null;

    window.addEventListener('hashchange', () => this.handleRouteChange());
    this.handleRouteChange();
    console.log('Router initialized.');
  },

  async handleRouteChange() {
    const hash = window.location.hash || '#'; //
    const path = hash === '#' ? '' : hash; //
    const ViewClass = this.routes[path] || this.routes['*'] || this.routes['']; //

    console.log(`Router: Handling route change for path: '${path}'`); //

    if (ViewClass) {
      if (this.currentView && typeof this.currentView.unmount === 'function') { //
        console.log('Router: Unmounting current view.'); //
        this.currentView.unmount(); //
      }

      const viewInstance = new ViewClass(this.mainElement); //
      this.currentView = viewInstance; //
      console.log(`Router: New view instance created for '${path}'.`); //

      const renderAll = async () => {
        console.log(`Router: Starting DOM update for '${path}'.`); //
        this.mainElement.innerHTML = ''; // Bersihkan konten lama //
        await viewInstance.render(); // Jalankan render()
        console.log(`Router: viewInstance.render() completed for '${path}'.`); //
        if (typeof viewInstance.afterRender === 'function') { //
          console.log(`Router: Starting viewInstance.afterRender() for '${path}'.`);
          await viewInstance.afterRender(); //
          console.log(`Router: viewInstance.afterRender() completed for '${path}'.`);
        }
        console.log(`Router: DOM update callback finished for '${path}'.`); //
      };

      // SELALU jalankan tanpa transisi untuk tes ini
      console.log(`Router: Bypassing View Transitions for testing. Updating DOM directly.`); //
      await renderAll(); //

    } else {
      console.warn(`Router: No view class found for path '${path}'. Displaying 404.`); //
      this.mainElement.innerHTML = '<p>404 - Halaman tidak ditemukan.</p>'; //
      if (this.currentView && typeof this.currentView.unmount === 'function') { //
        this.currentView.unmount(); //
        this.currentView = null; //
      }
    }
  },
};

export default Router;
