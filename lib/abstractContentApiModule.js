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
  constructor(...args) {
    super(...args);

    const content = await this.app.waitForModule('content');
    /**
    * Router instance
    * @type {Router}
    */
    this.router = content.router.createChildRouter(this.constructor.def.name);
    this.initMiddleware();
    this.initRoutes();
  }
}

module.exports = AbstractContentApiModule;
