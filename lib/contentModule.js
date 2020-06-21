const AbstractApiModule = require('adapt-authoring-api');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    const server = await this.app.waitForModule('server');
    /** @ignore */ this.root = 'content';
    /** @ignore */ this.collectionName = 'content';
    /** @ignore */ this.router = server.api.createChildRouter('content');
    this.useDefaultRouteConfig();
    /** @ignore */ this.routes = [
      ...this.routes,
      {
        route: '/schema/:_id',
        handlers: { get: this.serveSchema.bind(this) },
        permissions: { get: ['read:content'] }
      }
    ];
  }
  /**
  * Initialise the module
  * @return {Promise}
  */
  async init() {
    const [auth, authored] = await this.app.waitForModule("auth", "authored");
    authored.registerModule(this);

    const canAccessOne = async req => {
      if(req.params._id) {
        console.log('ContentModule#canAccessOne:', req.params._id);
      }
      return true;
    };
    auth.access.registerPlugin('/api/content', 'get', canAccessOne);
    auth.access.registerPlugin('/api/content', 'put', canAccessOne);
    auth.access.registerPlugin('/api/content', 'delete', canAccessOne);

    this.router.addHandlerMiddleware(this.schemaNameMiddleware);

    this.setReady();
  }
  /**
  * Middleware to store the content schemaName on client request (content works slightly differently to the standard APIs)
  * @param {ClientRequest} req
  * @param {ServerResponse} res
  * @param {Function} next
  */
  async schemaNameMiddleware(req, res, next) {
    req.apiData.schemaName = req.apiData.query.type || req.apiData.data.type;
    next();
  }
  /**
  * @param {String} schemaName Name of the schema to return
  * @param {String} courseId Course ID of content schema
  * @return {Promise} Resolves with schema
  */
  async getSchema(schemaName, courseId) {
    if(!courseId) { // just use default behaviour
      return super.getSchema(schemaName);
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
    const [config] = await this.find({ _type: 'config', _courseId: mongodb.ObjectId.parse(courseId) });
    if(!config) {
      throw new Error(`No matching config found for course '${courseId}'`);
    }
    return Promise.all(config._enabledPlugins.map(async p => {
      try {
        /** @todo content.getSchema(p) (plugin probably needs to define which schema is main */
      } catch(e) {
        this.log('warn', `failed to get settings for plugin '${p}', ${e.message}`);
      }
    }));
  }
  /** @override */
  async insert(...args) {
    // deal with changes to the order of the siblings
    return super.insert(...args);
  }
  /** @override */
  async replace(...args) {
    // deal with changes to the order of the siblings
    return super.replace(...args);
  }
  /** @override */
  async delete(...args) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    return super.delete(...args);
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
      const [item] = await this.find({ _id: req.params._id });
      if(!item) {
        return res.sendError(res.StatusCodes.Error.Missing);
      }
      const courseId = item._type === 'course' ? item._id : item.courseId;
      res.type('application/schema+json').json(await this.getSchema(item._type, courseId.toString()));
    } catch(e) {
      next(e);
    }
  }
}

module.exports = ContentModule;
