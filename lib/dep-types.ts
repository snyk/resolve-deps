import { DepType, HasDependencySpecs } from "./types";

// TODO(kyegupov): add a return type for this function

// Dependency types.
// We don't call out all of them, only the ones relevant to our behavior.
// extraneous means not found in package.json files, prod means not dev ATM
function depTypes(depName: string, pkg: HasDependencySpecs) {
  var type: string | null = null;
  var from = 'unknown';

  if (pkg.devDependencies && pkg.devDependencies[depName]) {
    type = depTypes.DEV;
    from = pkg.devDependencies[depName];
  }

  if (pkg.optionalDependencies && pkg.optionalDependencies[depName]) {
    type = depTypes.OPTIONAL;
    from = pkg.optionalDependencies[depName];
  }

  // production deps trump all
  if (pkg.dependencies && pkg.dependencies[depName]) {
    type = depTypes.PROD;
    from = pkg.dependencies[depName];
  }

  var bundled = !!(pkg.bundleDependencies &&
    pkg.bundleDependencies[depName]);

  return {
    type: type as string,
    from: from,
    bundled: bundled,
  };
}

depTypes.EXTRANEOUS = 'extraneous' as DepType;
depTypes.OPTIONAL = 'optional' as DepType;
depTypes.PROD = 'prod' as DepType;
depTypes.DEV = 'dev' as DepType;

// TODO(kyegupov): switch to plain exports
export = depTypes;
