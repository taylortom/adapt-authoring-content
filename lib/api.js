/** @ignore */
const routes = [
  {
    route: '/:id?',
    handlers: {
      post: function postContent(req, res, next) {
        console.log('postContent:', req.query, req.body);
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
