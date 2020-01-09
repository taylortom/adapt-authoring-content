const { AbstractModule, Responder, Utils } = require('adapt-authoring-core');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractModule {
  /** @override */
  constructor(...args) {
    super(...args);
    this.init();
  }
  async init() {
    const server = await this.app.waitForModule('server');
    this.router = server.api.createChildRouter('content');
    this.router.enableAPIMap();
    this.setReady();
  }
}

module.exports = ContentModule;
