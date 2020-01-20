const { App, Utils } = require('adapt-authoring-core');
const AbstractApiModule = require('adapt-authoring-api');
/**
* Abstract module which handles course content
* @extends {AbstractApiModule}
*/
class ContentApiModule extends AbstractApiModule {
  /** @override */
  constructor(type) {
    super(App.instance, { name: `content.type` });
    this.root = Utils.pluralise(type);
    this.schema = type;
  }
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

module.exports = ContentApiModule;
