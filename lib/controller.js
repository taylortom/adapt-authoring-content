const { DataStoreQuery, Responder } = require('adapt-authoring-core');
const Errors = require('./errors');
const lib = require('./lib');
/**
* Controller for the content API
*/
class Controller {
  /**
  * Create new content
  * @param {ClientRequest} req The client request object
  * @param {ServerResponse} res The server response object
  * @param {function} next The next middleware function in the stack
  */
  static postContent(req, res, next) {
    if(!req.body) {
      const e = new Error(`${Errors.CreateFail}, ${Errors.BadInput}`);
      e.statusCode = Responder.StatusCodes.Error.User;
      return next(e);
    }
    req.body.type = 'user';
    execFunc('post', req, res, next);
  }
  /**
  * Get existing content
  */
  static getContent(req, res, next) {
    execFunc('get', req, res, next);
  }
  /**
  * Update existing content
  * @param {ClientRequest} req The client request object
  * @param {ServerResponse} res The server response object
  * @param {function} next The next middleware function in the stack
  * @todo should allow updating of multiple users
  */
  static putContent(req, res, next) {
    if(!req.dsquery._id) {
      const e = new Error(`${Errors.UpdateFail}, ${Errors.BadInput}`);
      e.statusCode = Responder.StatusCodes.Error.User;
      return next(e);
    }
    execFunc('put', req, res, next);
  }
  /**
  * Delete existing content
  * @param {ClientRequest} req The client request object
  * @param {ServerResponse} res The server response object
  * @param {function} next The next middleware function in the stack
  * @todo should allow deletion of multiple users
  */
  static deleteContent(req, res, next) {
    if(!req.dsquery._id) {
      const e = new Error(`${Errors.DeleteFail}, ${Errors.BadInput}`);
      e.statusCode = Responder.StatusCodes.Error.User;
      return next(e);
    }
    req.dsquery._id = req.params.id;
    execFunc('delete', req, res, next);
  }
};
/**
* Convenience method to executes a passed function
* @param {String} func Name of the function to be called
* @param {ClientRequest} req The client request object
* @param {ServerResponse} res The server response object
* @param {function} next The next middleware function in the stack
*/
function execFunc(func, req, res, next) {
  const responder = new Responder(res);
  const args = [];

  if(req.dsquery) args.push(req.dsquery);
  if(req.body) args.push(req.body);

  return lib[func](...args)
    .then(data => responder.success({ data, statusCode: Responder.StatusCodes.Success[func] }))
    .catch(e => next(e));
}

module.exports = Controller;
