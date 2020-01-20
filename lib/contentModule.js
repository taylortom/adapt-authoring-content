const { AbstractModule, Utils } = require('adapt-authoring-core');
const ContentApiModule = require('./contentApiModule');
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
    try {
      await this.createChildren();
    } catch(e) {
      this.log('error', e);
    }
  }
  async createChildren() {
    this.modules = {};
    const adaptFramework = await this.app.waitForModule('adaptFramework');
    return Promise.all(adaptFramework.contentSchemas.map(s => this.createModule(s)));
  }
  async createModule(name) {
    if(this.modules[name]) {
      throw new Error(`A content module with the name '${name}' already exists`);
    }
    const instance = new ContentApiModule(name);
    this.modules[name] = instance;

    return instance.onReady();
  }
}

module.exports = ContentModule;
