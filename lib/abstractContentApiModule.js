const AbstractApiModule = require('adapt-authoring-api');
/**
* Abstract module which handles course content
* @extends {AbstractApiModule}
*/
class AbstractContentApiModule extends AbstractApiModule {
  /** @override */
  async setValues() {
    const content = await this.app.waitForModule('content');
    this.router = content.router.createChildRouter(this.root);
    this.routes = [
      {
        route: '/',
        handlers: {
          post: AbstractApiModule.requestHandler()
        }
      },
      {
        route: '/:_id?',
        handlers: {
          get: AbstractApiModule.requestHandler()
        }
      },
      {
        route: '/:_id',
        handlers: {
          put: AbstractApiModule.requestHandler(),
          delete: AbstractApiModule.requestHandler()
        }
      }
    ]
  }
}

module.exports = AbstractContentApiModule;
