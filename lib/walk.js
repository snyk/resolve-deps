module.exports = walk;

function walk(deps, filter) {
  if (!deps) {
    return [];
  }
  Object.keys(deps).forEach(function (name) {
    var res = filter(deps[name], name, deps);
    if (!res && deps[name] && deps[name].dep) {
      walk(deps[name].dependencies, filter);
    }
  });
}
