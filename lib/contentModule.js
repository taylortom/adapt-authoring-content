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
  /**
  * Initialise the module
  * @return {Promise}
  */
  async init() {
    const server = await this.app.waitForModule('server');
    /**
    * Router instance used by the module
    * @type {Router}
    */
    this.router = server.api.createChildRouter('content');
    this.router.enableAPIMap();
    this.setReady();
  }
}

module.exports = ContentModule;
