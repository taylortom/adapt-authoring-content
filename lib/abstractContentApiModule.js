const AbstractApiModule = require('adapt-authoring-api');
const { Utils } = require('adapt-authoring-core');
/**
* Abstract module which handles course content
* @extends {AbstractApiModule}
*/
class AbstractContentApiModule extends AbstractApiModule {
  /** @override */
  static get def() {
    return {
      name: 'content',
      routes: [
        {
          route: '/',
          handlers: ['post']
        },
        {
          route: '/:_id?',
          handlers: ['get']
        },
        {
          route: '/:_id',
          handlers: ['put','delete']
        }
      ]
    };
  }
  /** @override */
  async createRouter() {
    const content = await this.app.waitForModule('content');
    return content.router.createChildRouter(this.constructor.def.name);
  }
}

module.exports = AbstractContentApiModule;
