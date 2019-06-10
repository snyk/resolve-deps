// TODO(kyegupov): avoid default exports
export = unique;

import walk = require('./walk');
import { PackageExpanded } from './types';

function unique(deps: PackageExpanded) {
  var res = copy(deps);
  res.dependencies = {};

  walk(deps, function (dep) {
    var shallowCopy = copy(dep);
    res.dependencies[dep.name + '@' + dep.version] = shallowCopy;
  });

  return res;
}

// TODO: rename to withoutDeps, don't use reduce
function copy(dep: PackageExpanded): PackageExpanded {
  return Object.keys(dep).filter(function (key) {
    return key.toLowerCase().indexOf('dependencies') === -1;
  }).reduce(function (acc, curr) {
    acc[curr] = dep[curr];
    return acc;
  }, {}) as PackageExpanded;
}
