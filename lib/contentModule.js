const { AbstractModule, Responder, Utils } = require('adapt-authoring-core');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractModule {
  /** @override */
  constructor(...args) {
    super(...args);
    this.router = app.getModule('server').api.createChildRouter('content');
    this.router.enableAPIMap();
  }
}

module.exports = ContentModule;
