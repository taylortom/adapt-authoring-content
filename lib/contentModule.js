const { AbstractModule, Responder, Utils } = require('adapt-authoring-core');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractModule {
  /** @override */
  preload(app, resolve, reject) {
    Utils.defineGetter(this, 'router', app.getModule('server').api.createChildRouter('content'));
    app.auth.secureRoute(this.router.path, 'GET', ['read:content']);
    this.router.enableAPIMap();
    resolve();
  }
}

module.exports = ContentModule;
