const adapt_framework = require('adapt_framework');
const defaultApi = require('./api');
const { Module } = require('adapt-authoring-core');
const path = require('path');

/**
* Abstract module which handles content operations
* @extends {Module}
*/
class Content extends Module {
  /**
  *
  */
  static get FrameworkSchemas() {
    return adapt_framework.schemas;
  }
  /**
  * Gets the name for the API
  * @return {String} The name the API will be registered at
  */
  static get apiName() {
    throw new Error('should be overridden in subclasses');
  }
  /**
  * Gets the API definition
  * @return {Array<ContentAPIRoute>} The API definition
  */
  static get api() {
    return defaultApi;
  }
  /**
  * @param {App} app App instance
  * @param {Function} resolve Function to call on fulfilment
  * @param {Function} reject Function to call on rejection
  */
  preload(app, resolve, reject) {
    try {
      this.app.getModule('server').createApi(this.constructor.apiName)
        .setRoutes(this.constructor.api)
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
    const db = this.app.getModule('mongodb');
    (db.isConnected) ? this.addModels() : db.on('boot', this.addModels);
  }
  /**
  * Adds new DB models
  */
  addModels(...data) {
    // to be defined in subclasses
  }
  /**
  * Creates and adds a new model to the DB
  * @param {object} Options Options to be passed to MongoDB#addModel
  */
  addModel(options) {
    try {
      this.app.getModule('mongodb').addModel(options);
    } catch(e) {
      this.log('error', `Failed to add database model, ${e}`);
    }
  }
}

module.exports = Content;
