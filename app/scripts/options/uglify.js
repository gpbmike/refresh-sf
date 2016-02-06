(function () {
var defaults = Ember.Object.create();

[
  'sequences',
  'properties',
  'dead_code',
  'drop_debugger',
  'conditionals',
  'comparisons',
  'evaluate',
  'booleans',
  'loops',
  'unused',
  'hoist_funs',
  'if_return',
  'join_vars',
  'cascade',
  'warnings',
  'negate_iife'
].forEach(function (option) {
  defaults.set(option, true);
});

[
  'unsafe',
  'hoist_vars',
  'pure_getters',
  'drop_console',
  'keep_fargs',
  'toplevel'
].forEach(function (option) {
  defaults.set(option, false);
});

// comma separated pure_funcs variant
defaults.set('pure_funcs_cs', null);

var options = Ember.Object.create(defaults);

// override defaults with stored options
Ember.keys(options).forEach(function (key) {
  var storageKey = 'uglify.' + key;
  var storageItem = localStorage.getItem(storageKey);
  if (storageItem !== null && storageItem !== '') {

    if (storageItem === 'true') {
      storageItem = true;
    }
    if (storageItem === 'false') {
      storageItem = false;
    }

    options.set(key, storageItem);
  }
  options.addObserver(key, function () {
    if (options.get(key) === defaults.get(key)) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, options.get(key));
    }
  });
});

options.reopen({

  pure_funcs: function () {
    if (Ember.isEmpty(this.get('pure_funcs_cs'))) {
      return null;
    }
    return this.get('pure_funcs_cs').split(',').map(function (func) {
      return Ember.$.trim(func);
    });
  }.property('pure_funcs_cs'),

  serialize: function () {
    var result = {};
    for (var key in $.extend(true, {}, this)) {
      // Skip these
      if (key === 'serialize' || key === 'pure_funcs_cs' || !this.hasOwnProperty(key) || typeof this[key] === 'function') {
        continue;
      }
      result[key] = this[key];
    }

    result.pure_funcs = this.get('pure_funcs');

    return result;
  },

  reset: function () {
    var optionsObject = this;
    Ember.keys(defaults).forEach(function (key) {
      if (key === 'pure_funcs') {
        optionsObject.set('pure_funcs_cs', null);
      } else {
        optionsObject.set(key, defaults.get(key));
      }
    });
  }

});

window.uglifyOptions = Ember.Object.create({
  options: options,
  default: defaults
});
})();
