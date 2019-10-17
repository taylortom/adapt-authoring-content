const { AbstractModule, Utils } = require('adapt-authoring-core');
/**
* Module which handles course content
* @extends {AbstractModule}
*/
class ContentModule extends AbstractModule {
  preload(app, resolve, reject) {
    Utils.defineGetter(this, 'router', app.getModule('server').api.createChildRouter('content'));
    resolve();
  }
}

module.exports = ContentModule;
