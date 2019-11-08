// TODO(kyegupov): avoid default exports
export = unique;

import walk = require('./walk');
import { PackageExpanded } from './types';

async function unique(deps: PackageExpanded): Promise<PackageExpanded> {
  let res = copy(deps);
  res.dependencies = {};

  await walk(deps, async (dep) => {
    let shallowCopy = copy(dep);
    res.dependencies[dep.name + '@' + dep.version] = shallowCopy;
    return false;
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
