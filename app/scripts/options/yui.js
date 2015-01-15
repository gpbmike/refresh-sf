(function () {

  var defaults = Ember.Object.create();

  [
    'verbose',
    'nomunge',
    'preserve-semi',
    'disable-optimizations'
  ].forEach(function (option) {
    defaults.set(option, false);
  });

  [
    'line-break'
  ].forEach(function (option) {
    defaults.set(option, null);
  })

  var options = Ember.Object.create(defaults);

  // override defaults with stored options
  Ember.keys(options).forEach(function (key) {
    var storageKey = 'yui.' + key;
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
    serialize: function () {
      var result = {};
      for (var key in $.extend(true, {}, this)) {
        // Skip these
        if (key === 'serialize' || !this.hasOwnProperty(key) || typeof this[key] === 'function') {
          continue;
        }
        result[key] = this[key];
      }
      return result;
    },
    reset: function () {
      var optionsObject = this;
      Ember.keys(defaults).forEach(function (key) {
        optionsObject.set(key, defaults.get(key));
      });
    }
  });

  window.yuiOptions = Ember.Object.create({
    defaults: defaults,
    options: options
  });

  window.console.log(window.yuiOptions);

})();
