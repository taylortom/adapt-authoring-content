const { App } = require('adapt-authoring-core');

class Lib {
  static post(data) {
    return callDbFunction('create', null, data);
  }
  static get(query) {
    return callDbFunction('retrieve', query);
  }
  static put(query, data) {
    return callDbFunction('update', query, data);
  }
  static delete(query) {
    return callDbFunction('delete', query);
  }
}
/** @ignore */
function callDbFunction(funcName, query, data) {
  return new Promise((resolve, reject) => {
    const args = [];
    if(query) args.push(query);
    if(data) args.push(data);
    App.instance.getModule('mongodb')[funcName](...args).then(resolve).catch(reject);
  });
}

module.exports = Lib;
