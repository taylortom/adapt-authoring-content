const AbstractApiModule = require('adapt-authoring-api');
const { Responder } = require('adapt-authoring-core');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    this.useDefaultRouteConfig();
    const server = await this.app.waitForModule('server');
    /** @ignore */ this.root = 'content';
    /** @ignore */ this.collectionName = 'content';
    /** @ignore */ this.router = server.api.createChildRouter('content');
    /** @ignore */ this.routes = [
      { route: '/:type.schema.json', handlers: { get: this.serveSchema.bind(this) }},
      ...this.routes
    ];
  }
  /**
  * Initialise the module
  * @return {Promise}
  */
  async init() {
    const authored = await this.app.waitForModule("authored");
    authored.registerModule(this);
    this.requestHook.tap(this.schemaNameHook);
    this.setReady();
  }
  async schemaNameHook(req) {
    req.apiData.schemaName = req.apiData.query.type || req.apiData.data.type;
    return req;
  }
  /**
  * @param {String} schemaName Name of the schema to return
  * @param {String} courseId Course ID of content schema
  * @return {Promise} Resolves with schema
  */
  async getSchema(schemaName, courseId) {
    if(!courseId) { // just use default behaviour
      return super.getSchema(schemaName, courseId);
    }
    const jsonschema = await this.app.waitForModule('jsonschema');
    const pluginSchemas = await this.getPluginSchemas(schemaName, courseId);
    return jsonschema.composeSchema(schemaName, ...pluginSchemas);
  }
  /**
  * Retrieves the schema parts for all enabled extensions for the specified course
  * @param {String} baseSchemaName
  * @param {String} courseId
  * @return {Array<Object>}
  */
  async getPluginSchemas(baseSchemaName, courseId) {
    const [mongodb, contentplugin] = await this.app.waitForModule('mongodb', 'contentplugin');
    const [config] = await mongodb.find('configs', { _courseId: courseId });
    if(!config) {
      const e = new Error(`No matching config found for course '${courseId}'`);
      e.statusCode = Responder.StatusCodes.Error.Missing;
      throw e;
    }
    return Promise.all(config._enabledPlugins.map(async p => {
      try {
        return Promise.resolve(); // TODO needs linking to contentplugin module
      } catch(e) {
        this.log('warn', `failed to get settings for plugin._id '${p}', ${e.message}`);
      }
    }));
  }
  /** @override */
  async insert(collectionName, data) {
    // deal with changes to the order of the siblings
    return super.insert(this.collectionName, data);
  }
  /** @override */
  async replace(collectionName, filter, data) {
    // deal with changes to the order of the siblings
    return super.replace(this.collectionName, filter, data);
  }
  /** @override */
  async delete(collectionName, filter) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    return super.delete(this.collectionName, filter);
  }
  /**
  * Serves a single JSON schema
  * @param {ClientRequest} req
  * @param {ServerResponse} res
  * @param {Function} next
  * @return {Promise}
  */
  async serveSchema(req, res, next) {
    try {
      const schema = await this.getSchema(req.apiData.query.type, req.apiData.query.courseId);
      res.type('application/schema+json');
      new Responder(res).success(schema);
    } catch(e) {
      next(e);
    }
  }
}

module.exports = ContentModule;
