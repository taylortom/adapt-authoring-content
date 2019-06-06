const { MongooseSchema } = require('adapt-authoring-mongodb');
/**
* Abstract representation of Adapt content
*/
class ContentSchema extends MongooseSchema {
  /** @override */
  static get name() {
    throw new Error('Should be overridden in subclass');
  }
  /** @override */
  static get attributes() {
    return {
      _parentId: MongooseSchema.Types.ObjectId,
      test: {
        type: MongooseSchema.Types.String,
        default: 'Default Value'
      }
    };
  }
}

module.exports = ContentSchema;
