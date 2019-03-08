Both npm and Yarn support "GitHub URL" kind of dependency:

    "somepackage": "githubuser/somepackage",

It is possible to actually use a different name for the package:

    "myname": "githubuser/somepackage",

Npm claims to support that (https://docs.npmjs.com/files/package.json#github-urls), but in practice will just not pull the dependency. 

But Yarn actually allows it: https://yarnpkg.com/lang/en/docs/cli/add/#toc-yarn-add-alias

This fixture helps to test that we are actually supporting such renamed dependencies
during the resolution.
