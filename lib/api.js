const Controller = require('./controller');
/** @ignore */
const routes = [
  {
    route: '/:id?',
    handlers: {
      post: Controller.postContent,
      get: Controller.getContent,
      put: Controller.putContent,
      delete: Controller.deleteContent
    }
  }
];

module.exports = routes;
