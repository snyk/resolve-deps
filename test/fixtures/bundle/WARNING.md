# WARNING

`snyk-resolve-deps-fixtures` runs a `postinstall` command which adds
orphaned packages. On purpose.

`npm` is *gagging* to clean this up for you, and will do so if you
so much as look at this directory, and randomly anyway.
This breaks all the tests in confusing ways. `undefsafe` and `debug`,
but of course, you won't see those in the test output.

As of `6.13.0`, you can re-run the `postinstall`, without breaking
anything else, by running `npm i --save-dev snyk-resolve-deps-fixtures`.

I added it to every `package.json` in the hope that at least one of
them would run last, and there wouldn't be a race.
