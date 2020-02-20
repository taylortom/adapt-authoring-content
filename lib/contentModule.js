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
    this.setReady();
  }
  /**
  * @param {String} schemaName Name of the schema to return
  * @param {String} courseId Course ID of content schema
  * @return {Promise} Resolves with schema
  */
  async getSchema(schemaName, courseId) {
    return super.getSchema(schemaName, courseId);
  //   const jsonschema = await this.app.waitForModule('jsonschema');
  //   if(!schemaName) {
  //     throw new Error('Must provide schema name');
  //   }
  //   if(!courseId) {
  //     return jsonschema.getSchema(this.schemaName);
  //   }
  //   const [mongodb, contentplugin] = await this.app.waitForModule('mongodb', 'contentplugin');
  //   const [config] = await mongodb.find('configs', { _courseId: courseId });
  //   if(!config) {
  //     const e = new Error('No matching config found');
  //     e.statusCode = Responder.StatusCodes.Error.Missing;
  //     throw e;
  //   }
  //   const plugins = [];
  //   await Promise.all(config._enabledPlugins.map(async p => {
  //     try {
  //       const plugin = await contentplugin.retrieve({ _id: p });
  //       plugins.push(plugin.schema);
  //     } catch(e) {
  //       this.log('warn', `failed to get settings for plugin._id '${p}', ${e.message}`);
  //     }
  //   }));
  //   return jsonschema.composeSchema(this.schemaName, ...plugins);
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
