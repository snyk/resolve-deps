import { AbbreviatedVersion } from "package-json";

export type DepType = 'extraneous' | 'optional'| 'prod' | 'dev';

export interface DepSpecDict {
    [name: string]: string;
}

export interface DepExpandedDict {
    [name: string]: PackageExpanded;
}

// Intermediate type used during parsing
export interface PackageJsonEnriched extends AbbreviatedVersion {
    full: string;
    __from: string[];
    shrinkwrap: any;
}

export interface HasDependencySpecs {
    readonly dependencies?: {readonly [name: string]: string};
    readonly optionalDependencies?: {readonly [name: string]: string};
    readonly devDependencies?: {readonly [name: string]: string};
    readonly bundleDependencies?: {readonly [name: string]: string};
}

// Similar to package-json.AbbreviatedVersion, but with deps expanded
export interface PackageExpanded {
    name: string;
    version: string;
    dep: string; // this is the npm version range spec that was resolved to `version`
    license: string;
    depType: DepType;
    hasDevDependencies: boolean;
    full: string;
    __from: string[];
    from?: string[]; // TODO(kyegupov): find out why both __from and from are used
    __devDependencies: DepSpecDict;
    __dependencies: DepSpecDict;
    __optionalDependencies: DepSpecDict;
    __bundleDependencies: DepSpecDict;
    __filename: string;
    devDependencies: DepExpandedDict;
    dependencies: DepExpandedDict;
    optionalDependencies: DepExpandedDict;
    bundleDependencies: DepExpandedDict;
    shrinkwrap: any;
    bundled: any;
    __used?: boolean;
    problems?: string[];
    extraneous?: boolean;
}

export interface LogicalRoot extends PackageExpanded {
    numFileDependencies: number;
    numDependencies: number;
    unique: () => PackageExpanded;
    pluck: (path: string[], name: string, range: string) => false | PackageExpanded;
}

export interface Options {
    dev?: boolean; // report only development options
    extraFields?: string[]; // extract extra fields from dependencies' package.json files. example: `['files']`
    noFromArrays?: boolean; // don't include `from` arrays with list of deps from `root` on every node
    file?: string; //  location of the package file
}
