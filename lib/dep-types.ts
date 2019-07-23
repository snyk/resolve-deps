import { DepType, HasDependencySpecs } from "./types";

// TODO(kyegupov): add a return type for this function

// Dependency types.
// We don't call out all of them, only the ones relevant to our behavior.
// prod means not dev ATM
export function depTypes(depName: string, pkg: HasDependencySpecs) {
  let type: DepType | null = null;
  let from = 'unknown';

  if (pkg.devDependencies && pkg.devDependencies[depName]) {
    type = DepType.DEV;
    from = pkg.devDependencies[depName];
  }

  if (pkg.optionalDependencies && pkg.optionalDependencies[depName]) {
    type = DepType.OPTIONAL;
    from = pkg.optionalDependencies[depName];
  }

  // production deps trump all
  if (pkg.dependencies && pkg.dependencies[depName]) {
    type = DepType.PROD;
    from = pkg.dependencies[depName];
  }

  let bundled = !!(pkg.bundleDependencies &&
    pkg.bundleDependencies[depName]);

  return {
    type: type as string,
    from: from,
    bundled: bundled,
  };
}
