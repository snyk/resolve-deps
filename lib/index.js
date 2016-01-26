var physicalTree = module.exports.physicalTree = require('./deps');
var logicalTree = module.exports.logicalTree = require('./logical');

module.exports = function (dir) {
  return physicalTree(dir).then(logicalTree);
};