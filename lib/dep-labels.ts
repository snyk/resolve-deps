import * as depTypes from "./dep-types";
import { DepType, NpmScope, PackageExpanded, Options, PackageLabels } from "./types";

export function withPackageLabels(
  pkg: PackageExpanded,
  options: Options,
): PackageLabels | undefined {
  if (!options.showNpmScope) {
    return undefined;
  }

  const scope = getNpmScope(pkg.depType);

  return {
    "npm:scope": scope,
  };
}

export function getNpmScope(depType: DepType): NpmScope {
  switch (depType) {
    case depTypes.DEV:
      return "dev";
    case depTypes.PROD:
      return "prod";
    case depTypes.EXTRANEOUS:
    case depTypes.OPTIONAL:
    default:
      return "unknown";
  }
}