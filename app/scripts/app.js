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

    useYui: localStorage.getItem('useYui'),

    rememberYui: function () {
      if (this.get('useYui')) {
        localStorage.setItem('useYui', true);
      } else {
        localStorage.removeItem('useYui');
      }
    }.observes('useYui'),

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

      if (Ember.isEmpty(this.get('input'))) {
        return;
      }

      var input = this.get('input').replace();

      var highlighted = hljs.highlightAuto(input, this.get('languages'));

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

      var url = this.get('apiUrl') + (this.get('useYui') ? 'yui' : this.get('language')) + '/';

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.$.ajax({
          url : url,
          type: 'post',
          data: {
            code: this.get('input'),
            type: this.get('language')
          },
          dataType: 'json'
        }).done(function (data) {
          resolve(data.code);
        }.bind(this)).fail(function (jqXHR) {
          this.set('error', true);
          if (jqXHR.responseJSON.yuiError) {
            reject(jqXHR.responseJSON.yuiError);
          } else {
            reject(JSON.stringify(jqXHR.responseJSON, null, 2));
          }
        }.bind(this)).always(function () {
          this.set('isCompressing', false);
        }.bind(this));
      }.bind(this));
    },

    actions: {
      compress: function () {
        this.compress().then(function (code) {

          this.set('output', code);

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
      resetCompressor: function () {
        this.set('input', null);
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
        readAsDefault: 'Text',
        on: {
          load: function (event, file) {
            this.set('value', this.getWithDefault('value', '') + event.target.result);

            // add 'min' to the filename
            var filename = file.name.split('.');
            filename.splice(-1, 0, 'min');

            this.set('parentView.controller.filename', filename.join('.'));
          }.bind(this),
        }
      });

      this.$().focus().select();
    }
  });

  // Highlight the output textarea
  App.OutputTextArea = Ember.TextArea.extend({
    didInsertElement: function () {
      if (!this.get('parentView.controller.error')) {
        this.$().focus().select();
      }
    }
  });

  window.App = App;

})();
