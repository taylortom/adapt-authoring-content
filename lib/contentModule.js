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
    /** @ignore */ this.schemaName = 'content';
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
    const [authored, mongodb] = await this.app.waitForModule("authored", "mongodb");
    authored.registerModule(this);

    this.router.addHandlerMiddleware(this.schemaNameMiddleware.bind(this));

    mongodb.setIndex(this.collectionName, { _courseId: 1, _type: 1 });

    this.setReady();
  }
  /**
  * Middleware to store the content schemaName on client request (content works slightly differently to the standard APIs)
  * @param {ClientRequest} req
  * @param {ServerResponse} res
  * @param {Function} next
  */
  async schemaNameMiddleware(req, res, next) {
    const reqType = req.apiData.query._type || req.apiData.data._type;
    if(reqType) {
      req.apiData.schemaName = reqType;
      return next();
    }
    const reqId = req.apiData.query._id || req.apiData.data._id;
    if(!reqId) {
      return next();
    }
    const [item] = await this.find({ _id: reqId });
    if(!item) {
      return res.sendError(404, `No item found with _id matching '${reqId}'`);
    }
    req.apiData.schemaName = item._type;
    next();
  }
  /**
  * @param {String} schemaName Name of the schema to return
  * @param {String} courseId Course ID of content schema
  * @return {Promise} Resolves with schema
  */
  async getSchema(schemaName, courseId) {
    const schema = await super.getSchema(schemaName);
    if(!courseId) { // just use default behaviour
      return schema;
    }
    const pluginSchemas = await this.getPluginSchemas(schemaName, courseId);
    if(!pluginSchemas.length) {
      return schema;
    }
    const jsonschema = await this.app.waitForModule('jsonschema');
    return pluginSchemas.reduce((base, ext) => jsonschema.applyPatch(base, ext), schema);
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
    return config._enabledPlugins.reduce((m, p) => [...m, ...contentplugin.getPluginExtensionSchemas(p, baseSchemaName)], []);
  }
  /** @override */
  async insert(...args) {
    // @todo deal with changes to the order of the siblings
    return super.insert(...args);
  }
  /** @override */
  async replace(...args) {
    // @todo deal with changes to the order of the siblings
    return super.replace(...args);
  }
  /** @override */
  async delete({ _id }, options, mongoOptions, rootId) {
    // @todo deal with changes to the order of the siblings
    const mongodb = await this.app.waitForModule('mongodb');
    try { _id = mongodb.ObjectId.parse(_id); } catch(e) {} // let the DB handle this one

    const children = await this.find({ _parentId: _id });
    const data = (await Promise.all([
      super.delete({ _id }, {...options, emitEvent: false }, mongoOptions),
      ...children.map(c => this.delete({ _id: c._id }, options, mongoOptions, rootId || _id))
    ])).reduce((m,d) => Array.isArray(d) ? [...m, ...d] : [...m, d], []);

    if(!rootId) this.emit('delete', data);
    return children.length > 1 ? data : data[0];
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
