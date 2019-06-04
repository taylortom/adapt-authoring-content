const { Module } = require('adapt-authoring-core');
const path = require('path');
/**
* Abstract module which handles content operations
* @extends {Module}
*/
class Content extends Module {
  get apiName() {
    return this.constructor.name.toLowerCase();
  }
  get apiPath() {
    return path.join(__dirname, 'api');
  }
  get schemaPaths() {
    return { [this.apiName]: path.join(__dirname, 'schema') };
  }
  /**
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  preload(app, resolve, reject) {
    try {
      const api = require(this.apiPath);
      this.app.getModule('server').createApi(this.apiName)
        .setRoutes(api)
        .init();
    } catch(e) {
      reject(new Error(`Failed to load content API, ${e}`));
    }
    resolve();
  }
  /**
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  boot(app, resolve, reject) {
    const __addModels = () => {
      Object.entries(this.schemaPaths).forEach(([name, path]) => this.addModel(name, path));
      resolve();
    }
    const db = this.app.getModule('mongodb');
    (db.isConnected) ? __addModels() : db.on('boot', __addModels);
  }

  addModel(name, filepath) {
    try {
      this.app.getModule('mongodb').addModel(name, require(filepath));
    } catch(e) {
      this.log('error', `Failed to add database model, ${e}`);
    }
  }
}

module.exports = Content;
