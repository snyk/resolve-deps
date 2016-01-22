module.exports = args;

var alias = { d: 'dev' };

function args(processargv) {
  return processargv.slice(2).reduce(function reduce(acc, arg) {
    if (arg.indexOf('-') === 0) {
      arg = arg.slice(1);

      if (alias[arg] !== undefined) {
        acc[alias[arg]] = true;
      } else if (arg.indexOf('-') === 0) {
        acc[arg.slice(1)] = true;
      } else {
        acc[arg] = true;
      }
    } else {
      acc._.push(arg);
    }

    return acc;
  }, { _: [] });
}