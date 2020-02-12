const { App, Responder, Utils } = require('adapt-authoring-core');
const AbstractApiModule = require('adapt-authoring-api');
/**
* Abstract module which handles course content
* @extends {AbstractApiModule}
*/
class ContentApiModule extends AbstractApiModule {
  /** @override */
  constructor(type) {
    super(App.instance, { name: `content.${type}` });
    /**
    * Content type
    * @type {String}
    */
    this.type = type;
  }
  /** @override */
  async setValues() {
    super.setValues();
    const content = await this.app.waitForModule('content');
    /** @ignore */ this.root = Utils.pluralise(this.type);
    /** @ignore */ this.schemaName = this.type;
    /** @ignore */ this.collectionName = Utils.pluralise(this.type);
    /** @ignore */ this.router = content.router.createChildRouter(this.root);
    this.useDefaultRouteConfig();
  }
  /** @override */
  async init() {
    /** @ignore */ this.routes = [
      { route: '/schema.json', handlers: { get: this.serveSchema.bind(this) }},
      ...this.routes
    ];
    const jsonschema = await this.app.waitForModule('jsonschema');
    jsonschema.extendSchema(this.schemaName, 'authored');
    this.setReady();
  }
  /**
  * @param {String} schemaName Name of the schema to return
  * @param {String} courseId Course ID of content schema
  * @return {Promise} Resolves with schema
  */
  async getSchema(schemaName, courseId) {
    const jsonschema = await this.app.waitForModule('jsonschema');
    if(!courseId) {
      return jsonschema.getSchema(this.schemaName);
    }
    const [mongodb, contentplugin] = await this.app.waitForModule('mongodb', 'contentplugin');
    const [config] = await mongodb.find('configs', { _courseId: courseId });
    if(!config) {
      const e = new Error('No matching config found');
      e.statusCode = Responder.StatusCodes.Error.Missing;
      throw e;
    }
    const plugins = [];
    await Promise.all(config._enabledPlugins.map(async p => {
      try {
        const plugin = await contentplugin.retrieve({ _id: p });
        plugins.push(plugin.schema);
      } catch(e) {
        this.log('warn', `failed to get settings for plugin._id '${p}', ${e.message}`);
      }
    }))
    return jsonschema.composeSchema(this.schemaName, ...plugins);
  }
  /** @override */
  async validate(schemaName, data, options) {
    const courseId = data._courseId || this.type === 'course' && data._id;
    const schema = await this.getSchema(schemaName, courseId);
    const jsonschema = await this.app.waitForModule('jsonschema');
    return (await jsonschema.validate(schema, data, options));
  }
  /** @override */
  async insert(collectionName, data) {
    // deal with changes to the order of the siblings
    return await super.insert(this.collectionName, data);
  }
  /** @override */
  async replace(collectionName, filter, data) {
    // deal with changes to the order of the siblings
    return await super.replace(this.collectionName, filter, data);
  }
  /** @override */
  async delete(collectionName, filter) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    return await super.delete(this.collectionName, filter);
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
      const schema = await this.getSchema(req.query.courseId);
      res.type('application/schema+json');
      new Responder(res).success(schema);
    } catch(e) {
      next(e);
    }
  }
}

module.exports = ContentApiModule;
