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
        route: '/clone',
        handlers: { post: this.handleClone.bind(this) },
        permissions: { post: ['write:content'] }
      }
    ];
  }
  /** @override */
  async init() {
    await super.init();

    const [authored, jsonschema, mongodb, tags] = await this.app.waitForModule("authored", "jsonschema", "mongodb", "tags");
    /**
     * The current MongoDBModule instance for quick reference
     * @type {MongoDBModule}
     */
    this.db = mongodb;
    /**
     * The current JsonSchemaModule instance for quick reference
     * @type {JsonSchemaModule}
     */
    this.schema = jsonschema;

    await authored.registerModule(this);
    await tags.registerModule(this);

    if(this.app.dependencies['adapt-authoring-usergroups']) {
      const usergroups = await this.app.waitForModule('usergroups');
      await usergroups.registerModule(this);
    }
    this.router.addHandlerMiddleware(this.schemaNameMiddleware.bind(this));

    mongodb.setIndex(this.collectionName, { _courseId: 1, _type: 1 });
  }
  /** @override */
  async handleValidation(originalData, newData, options) {
    if(options.validate) {
      const schema = await this.getSchema(options.schemaName, this.getCourseIdFromParams(originalData, newData));
      Object.assign(newData, await this.schema.validate(schema, newData, options));
    }
  }
  /**
   * Determines the correct course _id from incoming data
   * @return {String}
   */
  getCourseIdFromParams(originalData, newData) {
    if(originalData) {
      return originalData._type === 'course' ? originalData._id : originalData._courseId;
    }
    return newData._type === 'course' ? newData._id : newData._courseId;
  }
  /** @override */
  async getSchema(schemaName, courseId) {
    const schema = await super.getSchema(schemaName);
    if(courseId) {
      const heirarchy = await this.schema.loadSchemaHierarchy(schemaName);
      await Promise.all(heirarchy.map(async h => {
        const schemas = await this.getPluginSchemas(h.$id, courseId);
        if(schemas.length) schemas.forEach(s => this.schema.applyPatch(schema,s));
      }));
    }
    return schema;
  }
  /**
   * Retrieves the schema parts for all enabled extensions for the specified course
   * @param {String} baseSchemaName
   * @param {String} courseId
   * @return {Array<Object>}
   */
  async getPluginSchemas(baseSchemaName, courseId) {
    const contentplugin = await this.app.waitForModule('contentplugin');
    const [config] = await this.find({ _type: 'config', _courseId: this.db.ObjectId.parse(courseId) });
    if(!config) return [];
    return config._enabledPlugins.reduce((m, p) => [...m, ...contentplugin.getPluginExtensionSchemas(p, baseSchemaName)], []);
  }
  /**
   * Recursively clones a content item
   * @param {String} userId The user performing the action
   * @param {String} _id ID of the object to clone
   * @param {String} _parentId The intended parent object (if this is not passed, no parent will be set)
   * @return {Promise}
   */
  async clone(userId, _id, _parentId) {
    const [originalDoc] = await this.find({ _id });
    if(!_id || !originalDoc) throw new Error(`No item found with _id '${_id}'`);

    const [parent] = await this.find({ _id: _parentId });
    if(!_parentId || !parent) throw new Error(`Invalid parent item with _id '${_parentId}'`);

    const cloneData = Object.assign({}, originalDoc, { _id: undefined, _parentId, createdBy: userId });
    delete cloneData._id;
    if(!cloneData._parentId) delete cloneData._parentId;
    // need the below stringify for validation to work on ObjectIds
    const { _id: newId } = await this.insert(JSON.parse(JSON.stringify(cloneData)));
    const children = await this.find({ _parentId: _id });
    return Promise.all(children.map(({ _id }) => this.clone(userId, _id, newId)));
  }
  /** @override */
  async insert(...args) {
    // @todo deal with changes to the order of the siblings
    return super.insert(...args);
  }
  /** @override */
  async update(query, data, options, mongoOptions) {
    // @todo deal with changes to the order of the siblings
    return super.update(query, data, options, mongoOptions);
  }
  /** @override */
  async replace(...args) {
    // @todo deal with changes to the order of the siblings
    return super.replace(...args);
  }
  /** @override */
  async delete(query, options, mongoOptions, rootId) {
    // @todo deal with changes to the order of the siblings
    this.setDefaultOptions(options);

    const mongodb = await this.app.waitForModule('mongodb');
    const [targetDoc] = await mongodb.find(options.collectionName, query);

    if(!targetDoc) {
      throw new Error('no matching document found');
    }
    if(targetDoc._type !== 'course') {
      return this.deleteChildren(targetDoc._id, options, mongoOptions, rootId);
    }
    // this find is needed for the event data later
    const courseDocs = await mongodb.find(options.collectionName, { _courseId: targetDoc._id });
    await mongodb.getCollection(options.collectionName).deleteMany({ _courseId: targetDoc._id }, mongoOptions);
    this.emit('delete', courseDocs);
    return courseDocs;
  }
  /**
   * Recursive deletion applied to each child content item
   * @param {String} _id Target _id
   * @param {Object} options
   * @param {Object} mongoOptions
   * @param {String} rootId The initiating content item
   */
  async deleteChildren(_id, options, mongoOptions, rootId) {
    try {
      _id = this.db.ObjectId.parse(_id);
    } catch(e) {} // let the DB handle this one
    const children = await this.find({ _parentId: _id });

    const data = (await Promise.all([
      super.delete({ _id }, {...options, emitEvent: false }, mongoOptions),
      ...children.map(c => this.delete({ _id: c._id }, options, mongoOptions, rootId || _id))
    ])).reduce((m,d) => Array.isArray(d) ? [...m, ...d] : [...m, d], []);

    if(!rootId) this.emit('delete', data);
    return data.length > 1 ? data : data[0];
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
      switch(reqType) {
        case 'page':
        case 'menu':
          req.apiData.schemaName = 'contentobject';
        default:
          req.apiData.schemaName = reqType;

      }
      return next();
    }
    const reqId = req.apiData.query._id || req.apiData.data._id;
    if(!reqId) {
      return next();
    }
    const [item] = await this.find({ _id: reqId });
    if(!item) {
      const e = new Error(`No item found with _id matching '${reqId}'`);
      e.statusCode = 404;
      return next(e);
    }
    req.apiData.schemaName = item._type;
    next();
  }
  /**
   * Request handler for cloning content items
   * @param {ClientRequest} req
   * @param {ServerResponse} res
   * @param {Function} next
   * @return {Promise}
   */
  async handleClone(req, res, next) {
    try {
      const { _id, _parentId } = req.body;
      await this.clone(req.auth.user._id, _id, _parentId);
      res.status(204).end();
    } catch(e) {
      return next(e);
    }
  }
  /** @override */
  async serveSchema(req, res, next) {
    try {
      const schema = await this.getSchema(req.apiData.query.type, req.apiData.query.courseId);
      if(!schema) {
        const e = new Error('No schema found');
        e.statusCode = 404;
        return next(e);
      }
      res.type('application/schema+json').json(schema);
    } catch(e) {
      return next(e);
    }
  }
}

module.exports = ContentModule;
