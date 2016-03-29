module.exports = function (dir, options) {
  return physicalTree(dir).then(function (res) {
    return logicalTree(res, options);
  });
};

// expose interal API
module.exports.walk = require('./walk');
module.exports.prune = require('./prune');
module.exports.pluck = require('./pluck');

var physicalTree = module.exports.physicalTree = require('./deps');
var logicalTree = module.exports.logicalTree = require('./logical');