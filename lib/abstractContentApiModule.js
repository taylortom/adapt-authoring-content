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
          route: '/:_id?',
          handlers: ['post','get','put','delete']
        }
      ]
    };
  }
  /** @override */
  preload(app, resolve, reject) {
    const content = this.app.getModule('content');
    content.on('preload', () => {
      /**
      * Router instance
      * @type {Router}
      */
      this.router;

      Utils.defineGetter(this, 'router', content.router.createChildRouter(this.constructor.def.name));
      this.initMiddleware();
      this.initRoutes();
      resolve();
    });
  }
}

module.exports = AbstractContentApiModule;
