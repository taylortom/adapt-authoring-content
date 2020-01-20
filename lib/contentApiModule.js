const { App, Utils } = require('adapt-authoring-core');
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
    (await this.app.waitForModule('jsonschema')).extendSchema(this.schema, 'authored');
    this.setReady();
  }
  /** @override */
  async create(data) {
    // deal with changes to the order of the siblings
    super.create(data);
  }
  /** @override */
  async update(query, data) {
    // deal with changes to the order of the siblings
    super.update(query, data);
  }
  /** @override */
  async delete(query) {
    // deal with changes to the order of the siblings
    // should call recursively on all children
    super.delete(data);
  }
}

module.exports = ContentApiModule;
