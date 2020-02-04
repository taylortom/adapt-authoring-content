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
    this.type = type;
  }
  /** @override */
  async setValues() {
    super.setValues();
    const content = await this.app.waitForModule('content');
    this.root = Utils.pluralise(this.type);
    this.schemaName = this.type;
    this.collectionName = Utils.pluralise(this.type);
    this.router = content.router.createChildRouter(this.root);
    this.useDefaultRouteConfig();
  }
  async init() {
    this.routes = [
      { route: '/schema.json', handlers: { get: this.serveSchema.bind(this) }},
      ...this.routes
    ];
    const jsonschema = await this.app.waitForModule('jsonschema');
    jsonschema.extendSchema(this.schemaName, 'authored');
    this.setReady();
  }
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
  async validate(schemaName, data) {
    const courseId = data._courseId || this.type === 'course' && data._id;
    const schema = await this.getSchema(schemaName, courseId);
    const jsonschema = await this.app.waitForModule('jsonschema');
    return (await jsonschema.validate(schema, data));
  }
  /** @override */
  async insert(data) {
    // deal with changes to the order of the siblings
    return await super.insert(this.collectionName, data);
  }
  /** @override */
  async replace(filter, data) {
    // deal with changes to the order of the siblings
    return await super.replace(this.collectionName, filter, data);
  }
  /** @override */
  async delete(filter) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    return await super.delete(this.collectionName, filter);
  }
  async serveSchema(req, res, next) {;
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
