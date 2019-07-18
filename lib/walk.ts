import { DepExpandedDict, PackageExpanded } from "./types";

// TODO(kyegupov): avoid default exports
export = walk;

function walk(depsOrPkg: PackageExpanded | DepExpandedDict, filter) {
  if (!depsOrPkg) {
    return [];
  }

  let deps = ((depsOrPkg as PackageExpanded).dependencies ? depsOrPkg.dependencies : depsOrPkg) as DepExpandedDict;

  Object.keys(deps).forEach(function (name) {
    let res = filter(deps[name], name, deps);
    if (!res && deps[name] && deps[name].dep) {
      walk(deps[name].dependencies, filter);
    }
  });
}
