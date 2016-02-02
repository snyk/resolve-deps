module.exports = args;

var alias = { d: 'dev', c: 'count' };
var strings = ['count'];
var taken = [];

function args(processargv) {
  return processargv.slice(2).reduce(function reduce(acc, arg, i, all) {
    if (taken.indexOf(i) !== -1) {
      return acc;
    }

    if (arg.indexOf('-') === 0) {
      arg = arg.slice(1);

      if (alias[arg] !== undefined) {
        arg = '-' + alias[arg];
      }

      if (arg.indexOf('-') === 0) {
        arg = arg.slice(1);
        acc[arg] = true;

        if (strings.indexOf(arg) !== -1) {
          acc[arg] = all[i + 1];
          taken.push(i + 1);
        }
      }
    } else {
      acc._.push(arg);
    }

    return acc;
  }, { _: [] });
}