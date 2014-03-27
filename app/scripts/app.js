(function () {
  'use strict';

  var App = Ember.Application.create({
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

    placeholder: 'To get started, paste your JavaScript or CSS code here, or drag in files from your desktop.',

    apiUrl: window.ENV.apiUrl,

    gzipUrl: function () {
      return this.get('apiUrl') + this.get('filename');
    }.property('apiUrl', 'filename'),

    saveDisabled: function () {
      return !this.get('filename');
    }.property('filename'),

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
      this.set('language', null);
      this.set('error', null);

      this.set('isCompressing', true);

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.$.ajax({
          url: this.get('apiUrl'),
          type: 'post',
          data: { code: this.get('input') },
          dataType: 'json'
        }).done(function (data) {
          this.set('language', data.language);
          this.set('output', data.code);
          Ember.run(null, resolve);
        }.bind(this)).fail(function (jqXHR) {
          this.set('error', true);
          this.set('output', JSON.stringify(jqXHR.responseJSON, null, 2));
          Ember.run(null, reject);
        }.bind(this)).always(function () {
          this.set('isCompressing', false);
        }.bind(this));
      }.bind(this));
    },

    actions: {
      compress: function () {
        this.compress().then(function () {

          var filename;

          if (this.get('language') === 'css') {
            filename = 'style.min.css';
          } else {
            filename = 'app.min.js';
          }

          this.set('filename', filename);

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
        this.set('language', null);
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
          load: function (event) {
            this.set('value', this.getWithDefault('value', '') + event.target.result);
          }.bind(this),
        }
      });
    }
  });

  window.App = App;

})();
