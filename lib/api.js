const { App, Responder } = require('adapt-authoring-core');
/** @ignore */
const routes = [
  {
    route: '/:id?',
    handlers: {
      post: function postContent(req, res, next) {
        console.log('postContent:', req.params, req.query, req.body);
        const resp = new Responder(res);
        const testData = {
          type: 'course',
          title: 'My First Course',
          body: 'Course body text.'
        };
        App.instance.getModule('mongodb').create(testData)
          .then(data => resp.success({ type: 'course', data }, 201))
          .catch(error => resp.error(error));
      },
      get: function getContent(req, res, next) {
        const resp = new Responder(res);
        console.log('getContent:', req.params, req.query || '', req.body);
        resp.success({ type: 'course', data: [] }, 200);
      },
      put: function putContent(req, res, next) {
        console.log('putContent:', req.params, req.query || '', req.body);
        new Responder(res).success({ type: 'course', data: {} });
      },
      delete: function deleteContent(req, res, next) {
        console.log('deleteContent:', req.params, req.query || '', req.body);
        new Responder(res).success({ type: 'course' }, 204);
      }
    }
  }
];

module.exports = routes;
