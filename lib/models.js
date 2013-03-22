var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.user = mongoose.model('users', new Schema({
  gid: String,
  minecraft: String,
  access: {
    web: {
      get: [String],
      post: [String]
    }
  }
}));
