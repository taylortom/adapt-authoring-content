const { MongooseSchema } = require('adapt-authoring-mongodb');
/**
* Abstract representation of Adapt content
*/
class ContentSchema extends MongooseSchema {
  /** @override */
  static get attributes() {
    return {
      _parentId: MongooseSchema.Types.ObjectId
    };
  }
}

module.exports = ContentSchema;
