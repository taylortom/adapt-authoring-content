const { App, DataQuery, Responder, Utils } = require('adapt-authoring-core');
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
    this.schema = this.type;
    this.router = content.router.createChildRouter(this.root);
    this.useDefaultRouteConfig();
  }
  async init() {
    this.routes = [
      { route: '/schema.json', handlers: { get: this.serveSchema.bind(this) }},
      ...this.routes
    ];
    const jsonschema = await this.app.waitForModule('jsonschema');
    jsonschema.extendSchema(this.schema, 'authored');
    this.setReady();
  }
  async getSchema(courseId) {
    if(!courseId) {
      throw new Error('Must provide course ID');
    }
    const [jsonschema, mongodb, contentplugin] = await this.app.waitForModule('jsonschema', 'mongodb', 'contentplugin');
    const [course] = await mongodb.retrieve(new DataQuery({ type: 'config', fieldsMatching: { _courseId: courseId } }));
    if(!course) {
      const e = new Error('No matching course found');
      e.statusCode = Responder.StatusCodes.Error.Missing;
      throw e;
    }
    const plugins = [];
    await Promise.all(course._enabledPlugins.map(async p => {
      try {
        const plugin = await contentplugin.retrieve({ _id: p });
        plugins.push(plugin.schema);
      } catch(e) {
        this.log('warn', e);
      }
    }))
    return jsonschema.composeSchema(this.schema, plugins);
  }
  async validate(data) {
    if(!data) {
      throw new Error('Cannot validate, must provide data');
    }
    const courseId = data._courseId || this.type === 'course' && data._id;
    const schema = await this.getSchema(courseId);
    const validated = Object.assign({}, data);
    const jsonschema = await this.app.waitForModule('jsonschema');
    await jsonschema.validate(schema, validated);
    return validated;
  }
  /** @override */
  async create(data) {
    // deal with changes to the order of the siblings
    return await super.create(data);
  }
  /** @override */
  async update(query, data) {
    // deal with changes to the order of the siblings
    return await super.update(query, data);
  }
  /** @override */
  async delete(query) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    return await super.delete(data);
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
