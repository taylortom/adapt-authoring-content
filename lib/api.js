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
        console.log('getContent:', req.query, req.body);
      },
      put: function putContent(req, res, next) {
        console.log('putContent:', req.query, req.body);
      },
      delete: function deleteContent(req, res, next) {
        console.log('deleteContent:', req.query, req.body);
      }
    }
  }
];

module.exports = routes;
