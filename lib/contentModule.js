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

    this.setReady();
    try {
      await this.createChildren();
    } catch(e) {
      this.log('error', e);
    }
  }
  /**
  *
  * @return {Promise}
  */
  async createChildren() {
    /**
    * Key/value store of child content modules
    * @type {Object}
    */
    this.modules = {};
    const adaptFramework = await this.app.waitForModule('adaptFramework');
    return Promise.all(adaptFramework.contentSchemas.map(s => this.createModule(s)));
  }
  /**
  * Creates a new child instance of ContentApiModule
  * @param {String} name Name of the child module to create
  * @return {Promise} Module#onReady
  */
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
