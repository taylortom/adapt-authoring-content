const Api = require('adapt-authoring-api').Module;
const adapt_framework = require('adapt_framework');
const controller = require('./controller');
/**
* Abstract module which handles content operations
* @extends {Module}
*/
class Content extends Api {
  /**
  * Returns the schema files stored locally in the adapt_framework
  * @type {Object}
  * @see https://github.com/adaptlearning/adapt_framework
  */
  static get FrameworkSchemas() {
    return adapt_framework.schemas;
  }
}

module.exports = Content;
