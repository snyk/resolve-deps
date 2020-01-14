Yarn supports "link" kind of dependency:

    "somepackage": "./path/somepackage",


Yarn: https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-link-dependency-type.md

This fixture helps to test that we are actually supporting such linked dependencies during the resolution.
