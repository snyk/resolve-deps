import { DepExpandedDict, PackageExpanded } from "./types";

// TODO(kyegupov): avoid default exports
export = walk;

async function walk(depsOrPkg: PackageExpanded | DepExpandedDict,
                    filter: (deps, name?, allDeps?) => Promise<boolean>): Promise<void> {
  if (!depsOrPkg) {
    return;
  }

  let deps = ((depsOrPkg as PackageExpanded).dependencies ? depsOrPkg.dependencies : depsOrPkg) as DepExpandedDict;

  for (const name of Object.keys(deps)) {
    let res = await filter(deps[name], name, deps);
    if (!res && deps[name] && deps[name].dep) {
      await walk(deps[name].dependencies, filter);
    }
  }
}
