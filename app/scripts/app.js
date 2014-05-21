(function () {

  'use strict';

  Ember.throttledObserver = function(func, key, time) {
    return Em.observer(function() {
        Em.run.throttle(this, func, time);
    }, key);
  };

  var App = Ember.Application.create({
    rootElement             : '#compressor',
    LOG_ACTIVE_GENERATION   : true,
    LOG_MODULE_RESOLVER     : true,
    LOG_TRANSITIONS         : true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_VIEW_LOOKUPS        : true
  });

  App.Router.map(function() {
    this.route('compressor', { path: '/' });
  });

  App.CompressorRoute = Ember.Route.extend();

  App.CompressorController = Ember.Controller.extend({

    placeholder: 'Paste your JavaScript or CSS code here, or drag in files from your desktop.',

    apiUrl: window.ENV.apiUrl,

    language: null,
    languages: ['javascript', 'css'],

    gzipUrl: function () {
      return this.get('apiUrl') + 'gz/' + this.get('filename');
    }.property('apiUrl', 'filename'),

    saveDisabled: function () {
      return !this.get('filename');
    }.property('filename'),

    compressDisabled: function () {
      return !this.get('input') || !this.get('language') || this.get('isCompressing');
    }.property('input', 'language', 'isCompressing'),

    checkLanguage: Ember.throttledObserver(function () {

      var highlighted = hljs.highlightAuto(this.get('input'), this.get('languages'));

      this.set('language', highlighted.language);

    }, 'input', 500),

    displayLanguage: function () {

      switch (this.get('language')) {
      case 'javascript':
        return 'JavaScript';
      case 'css':
        return 'CSS';
      default:
        return null;
      }

    }.property('language'),

    compress: function () {
      this.set('output', null);
      this.set('error', null);

      this.set('isCompressing', true);

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.$.ajax({
          url: this.get('apiUrl') + this.get('language') + '/',
          type: 'post',
          data: { code: this.get('input') },
          dataType: 'json'
        }).done(function (data) {
          this.set('output', data.code);
          Ember.run(null, resolve);
        }.bind(this)).fail(function (jqXHR) {
          this.set('error', true);
          Ember.run(null, reject, JSON.stringify(jqXHR.responseJSON, null, 2));
        }.bind(this)).always(function () {
          this.set('isCompressing', false);
        }.bind(this));
      }.bind(this));
    },

    actions: {
      compress: function () {
        this.compress().then(function () {

          if (this.get('filename')) {
            return;
          }

          if (this.get('language') === 'css') {
            this.set('filename', 'style.min.css');
          } else {
            this.set('filename', 'app.min.js');
          }

        }.bind(this), function (error) {
          this.set('error', true);
          this.set('output', error);
        }.bind(this));
      },
      save: function () {
        var blob = new Blob([this.get('output')], {type: 'text/' + this.get('language') + ';charset=utf-8'});
        saveAs(blob, this.get('filename'));
      },
      saveGzip: function () {
        Ember.$('form').trigger('submit');
      },
      clearOutput: function () {
        this.set('output', null);
      },
      createGist: function () {

        var controller = this;

        var data = { files: {} };

        data.files[this.get('filename')] = { content: this.get('output') };

        $.ajax({
          url: 'https://api.github.com/gists',
          type: 'POST',
          dataType: 'json',
          data: JSON.stringify(data)
        }).done(function (response) {
          controller.set('gistUrl', response.files[controller.get('filename')].raw_url);
        });

      }
    }

  });

  // Allow users to drop files into textarea from desktop
  App.DragAndDrop = Ember.TextArea.extend({
    didInsertElement: function () {
      this.$().fileReaderJS({
        accept: 'text/*',
        dragClass: 'dragging',
        on: {
          load: function (event, file) {
            this.set('value', this.getWithDefault('value', '') + event.target.result);

            var filename = file.name.split('.');
            filename.splice(-1, 0, 'min');

            this.set('parentView.controller.filename', filename.join('.'));
          }.bind(this),
        }
      });
    }
  });

  App.OutputTextArea = Ember.TextArea.extend({
    didInsertElement: function () {
      this.$().focus().select();
    }
  });

  window.App = App;

})();
