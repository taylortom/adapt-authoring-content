const { Module } = require('adapt-authoring-core');
/**
* Abstract module which handles content operations
* @extends {Module}
*/
class Content extends Module {
  get apiPath() {
    return path.join(__dirname, 'api');
  }
  get schemaPaths() {
    return { [this.name]: path.join(__dirname, 'schema') };
  }
  /**
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  preload(app, resolve, reject) {
    const api = require(this.apiPath);
    this.app.getModule('server').createApi(this.name)
      .setRoutes(api)
      .init();

    resolve();
  }
  /**
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  boot(app, resolve, reject) {
    const db = this.app.getModule('mongodb');

    if(!db.isConnected) {
      this.log('warn', `Database not connected, cannot boot ${this.name}`);
      return resolve();
    }
    db.on('boot', () => {
      Object.entries(this.schemaPaths).forEach(([name, path]) => this.addModel(name, path));
      resolve();
    });
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
