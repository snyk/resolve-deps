module.exports = function (dir, options) {
  return physicalTree(dir).then(function (res) {
    return logicalTree(res, options);
  });
};

var physicalTree = module.exports.physicalTree = require('./deps');
var logicalTree = module.exports.logicalTree = require('./logical');