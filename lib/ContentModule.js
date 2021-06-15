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
    jsonschema.extendSchema('config', authored.schemaName);

    await tags.registerModule(this);
    jsonschema.extendSchema('config', tags.schemaExtensionName);

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
    if(!courseId) {
      return super.getSchema(schemaName);
    }
    const [schema, ...heirarchy] = await this.schema.loadSchemaHierarchy(schemaName);
    await Promise.all(heirarchy.map(async h => {
      const pluginSchemas = await this.getPluginSchemas(h.$anchor, courseId);
      [h, ...pluginSchemas].forEach(s => this.schema.applyPatch(schema,s));
    }));
    return schema;
  }
  /**
   * Retrieves the schema parts for all enabled extensions for the specified course
   * @param {String} baseSchemaName
   * @param {String} courseId
   * @return {Array<Object>}
   */
  async getPluginSchemas(baseSchemaName, courseId) {
    const _courseId = typeof courseId === 'object' ? courseId.toString() : courseId;
    const contentplugin = await this.app.waitForModule('contentplugin');
    const [config] = await this.find({ _type: 'config', _courseId });
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

    if(originalDoc._type === 'course') {
      return this.cloneCourse(userId, _id);
    }
    const [parent] = await this.find({ _id: _parentId });

    if(!_parentId || !parent) {
      throw new Error(`Invalid parent item with _id '${_parentId}'`);
    }
    const cloneData = Object.assign({}, originalDoc, { _courseId: parent._courseId, _parentId, createdBy: userId });
    delete cloneData._id;
    if(!cloneData._parentId) delete cloneData._parentId;
    // need the below stringify for validation to work on ObjectIds
    const schemaName = cloneData._type === 'menu' || cloneData._type === 'page' ? 'contentobject' : cloneData._type;
    const newData = await this.insert(JSON.parse(JSON.stringify(cloneData)), { schemaName });
    const children = await this.find({ _parentId: _id });
    await Promise.all(children.map(({ _id }) => this.clone(userId, _id, newData._id)));
    return newData;
  }
  async cloneCourse(userId, _id) {
    const contentItems = await this.find({ _courseId: _id });
    const oldCourse = contentItems.find(i => i._type === 'course');
    const oldConfig = contentItems.find(i => i._type === 'config');
    const oldContent = contentItems.filter(i => i._type === 'menu' || i._type === 'page');

    oldCourse.createdBy = oldConfig.createdBy = userId;
    // insert course object
    let newCourse = await this.insert(JSON.parse(JSON.stringify(oldCourse)), { schemaName: 'course' });
    const _courseId = newCourse._id.toString();
    newCourse = await this.update({ _id: _courseId }, { _courseId });
    // insert config object
    oldConfig._courseId = _courseId;
    await this.insert(JSON.parse(JSON.stringify(oldConfig)), { schemaName: 'config' });
    // insert the remaining content objects
    await Promise.all(oldContent.map(co => this.clone(userId, co._id.toString(), _courseId)));
    return newCourse;
  }
  /** @override */
  async insert(data, options, mongoOptions) {
    // @todo deal with changes to the order of the siblings
    const doc = await super.insert(data, options, mongoOptions);

    if(doc._type === 'course') { // add the _courseId to a new course to make querying easier
      return this.update({ _id: doc._id }, { _courseId: doc._id.toString() });
    }
    await this.updateSortOrder(doc, data);
    await this.updateEnabledPlugins(doc);

    return doc;
  }
  /** @override */
  async update(query, data, options, mongoOptions) {
    // @todo deal with changes to the order of the siblings
    const doc = await super.update(query, data, options, mongoOptions);
    await this.updateSortOrder(doc, data);
    await this.updateEnabledPlugins(doc);
    return doc;
  }
  /** @override */
  async replace(query, data, options, mongoOptions) {
    // @todo deal with changes to the order of the siblings
    const doc = await super.replace(query, data, options, mongoOptions);
    await this.updateSortOrder(doc, data);
    await this.updateEnabledPlugins(doc);
    return doc;
  }
  /** @override */
  async delete(query, options, mongoOptions, rootId) {
    // @todo deal with changes to the order of the siblings
    this.setDefaultOptions(options);

    const [targetDoc] = await this.find(query);

    if(!targetDoc) {
      throw new Error('no matching document found');
    }
    if(targetDoc._type !== 'course') {
      await this.updateEnabledPlugins(targetDoc);
      return this.deleteChildren(targetDoc._id, options, mongoOptions, rootId);
    }
    const mongodb = await this.app.waitForModule('mongodb');
    // this find is needed for the event data later
    const courseDocs = await this.find({ _courseId: targetDoc._id });
    await mongodb.getCollection(options.collectionName).deleteMany({ _courseId: targetDoc._id }, mongoOptions);
    this.emit('delete', courseDocs);
    await this.updateSortOrder(targetDoc);
    return courseDocs;
  }
  async updateSortOrder(item, updateData) {
    if(item._type === 'config' || item._type === 'course' || !item._parentId) {
      return;
    }
    const siblings = await this.find({ _parentId: item._parentId, _id: { $ne: item._id } }, {}, { sort: { _sortOrder: 1 } });
    if(updateData) {
      const newSO = item._sortOrder-1 > -1 ? item._sortOrder-1 : siblings.length;
      siblings.splice(newSO, 0, item);
    }
    return Promise.all(siblings.map(async (s,i) => {
      const _sortOrder = i+1;
      if(s._sortOrder !== _sortOrder) super.update({ _id: s._id }, { _sortOrder });
    }));
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

    this.emit('delete', data[0]);
    return data.length > 1 ? data : data[0];
  }
  async updateEnabledPlugins({ _courseId, _type }) {
    // check config exists before continuing
    const [config] = await this.find({ _courseId, _type: 'config' }); 
    if(!config) {
      return;
    }
    const [contentplugin, mongodb] = await this.app.waitForModule('contentplugin', 'mongodb');
    const allComponentNames = (await contentplugin.find({ type: 'component' })).map(p => p.name);
    const usedComponents = (await mongodb.getCollection(this.collectionName).aggregate([
      { $match: { _type, _courseId } },
      { $lookup: { from: 'contentplugins', localField: '_component', foreignField: 'name', as: 'component' } },
      { $unwind: '$component' },
      { $group: { _id: '$component', data: { $addToSet: '$component' } } }
    ]).toArray());
    const usedComponentNames = [];
    
    usedComponents.forEach(data => {
      const c = data.data[0];
      if(c.pluginDependencies) usedComponentNames.push(...Object.keys(c.pluginDependencies));
      usedComponentNames.push(c.name);
    });
    const { _enabledPlugins: existingPlugins, _menu, _theme} = config;
    const _enabledPlugins = existingPlugins.filter(p => !allComponentNames.includes(p)).concat(usedComponentNames);
    // add menu/theme special cases
    if(!_enabledPlugins.includes(_menu)) _enabledPlugins.push(_menu);
    if(!_enabledPlugins.includes(_theme)) _enabledPlugins.push(_theme);
    // make sure the globals have been updated with the latest defaults
    try { 
      await super.update({ _id: _courseId }, {}, { schemaName: 'course', useDefaults: true });
    } catch(e) {}
    if(_type !== 'config') {
      return this.update({ _type: 'config', _courseId }, { _enabledPlugins }, { schemaName: 'config' });
    }
  }
  async getContentSchemaName({ _component, _id, _type }) {
    if(_type && _type !== 'component') {
      return _type === 'page' || _type === 'menu' ? 'contentobject' : _type;
    }
    let componentName = _component;
    
    if(_id) {
      const [item] = await this.find({ _id });
      if(item) {
        if(item._type !== 'component') return item._type;
        componentName = item._component;
      }
    }
    const error = new Error(`Couldn't determine schema name`);

    if(!componentName) throw error;

    const [component] = await (await this.app.waitForModule('contentplugin')).find({ name: componentName });
    if(!component) throw error;
    
    return `${component.targetAttribute.slice(1)}-component`;
  }
  /**
   * Middleware to store the content schemaName on client request (content works slightly differently to the standard APIs)
   * @param {ClientRequest} req
   * @param {ServerResponse} res
   * @param {Function} next
   */
  async schemaNameMiddleware(req, res, next) {
    try {
      req.apiData.schemaName = await this.getContentSchemaName({ ...req.apiData.query, ...req.apiData.data });
    } catch(e) {
      req.apiData.schemaName = this.schemaName;
    }
    next();
  }
  /**
   * Request handler for cloning content items
   * @param {ClientRequest} req
   * @param {ServerResponse} res
   * @param {Function} next
   * @return {Promise} Resolves with the cloned data
   */
  async handleClone(req, res, next) {
    try {
      const { _id, _parentId } = req.body;
      const newData = await this.clone(req.auth.user._id, _id, _parentId);
      res.status(201).json(newData);
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
