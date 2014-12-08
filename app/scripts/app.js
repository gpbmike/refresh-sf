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

    apiUrl: window.ENV.apiUrl,

    language: null,
    languages: ['javascript', 'css', 'html'],

    useYui: localStorage.getItem('useYui'),

    compressOptions: Ember.Object.create({
      javascript: window.uglifyOptions,
      css: window.cleancssOptions
    }),

    htmlDisabled: function () {
      return this.get('isCompressing') || this.get('useYui');
    }.property('isCompressing', 'useYui'),

    rememberYui: function () {
      if (this.get('useYui')) {
        localStorage.setItem('useYui', true);
      } else {
        localStorage.removeItem('useYui');
      }
    }.observes('useYui'),

    isHtml: function () {
      return this.get('language') === 'html';
    }.property('language'),

    gzipUrl: function () {
      return this.get('apiUrl') + 'gz/' + this.get('filename');
    }.property('apiUrl', 'filename'),

    saveDisabled: function () {
      return !this.get('filename');
    }.property('filename'),

    compressDisabled: function () {
      return !this.get('input') || !this.get('language') || this.get('isCompressing');
    }.property('input', 'language', 'isCompressing'),

    guessJavascript: function () {
      return this.get('language') === 'javascript';
    }.property('language'),

    guessCss: function () {
      return this.get('language') === 'css';
    }.property('language'),

    guessHtml: function () {
      return this.get('language') === 'html';
    }.property('language'),

    checkLanguage: Ember.throttledObserver(function () {

      this.set('unknownLanguage', null);
      this.set('language', null);

      if (Ember.isEmpty(this.get('input'))) {
        return;
      }

      var input = this.get('input').replace();

      var highlighted = hljs.highlightAuto(input, this.get('languages'));

      this.set('language', highlighted.language);

      if (!this.get('language')) {
        this.set('unknownLanguage', true);
      }

    }, 'input', 500),

    displayLanguage: function () {

      switch (this.get('language')) {
      case 'javascript':
        return 'Javascript';
      case 'css':
        return 'CSS';
      case 'html':
        return 'HTML';
      default:
        return null;
      }

    }.property('language'),

    compress: function (language) {

      if (!language) {
        return Ember.RSVP.Promise.reject('Compression requires a language.');
      }

      if (!this.get('input')) {
        return Ember.RSVP.Promise.reject('Compression requires input.');
      }

      this.set('isCompressing', true);

      var minifier = this.get('useYui') && language !== 'html' ? 'yui' : language;

      var options = this.get('compressOptions').get(minifier).get('options').serialize();

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.$.ajax({
          url : this.get('apiUrl') + minifier + '/',
          type: 'post',
          data: {
            code: this.get('input'),
            type: this.get('language'),
            options: options
          },
          dataType: 'json'
        }).done(function (data) {
          resolve(data.code);
        }.bind(this)).fail(function (jqXHR) {
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
      compress: function (language) {
        language = language || this.get('language');

        this.set('output', null);
        this.set('error', null);

        this.compress(language).then(function (code) {

          this.set('output', code);

          if (this.get('filename')) {
            return;
          }

          switch (language) {
          case 'css':
            this.set('filename', 'style.min.css');
            break;
          case 'javascript':
            this.set('filename', 'app.min.js');
            break;
          case 'html':
            this.set('filename', 'index.min.html');
            break;
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

      },

      defaultOptions: function (set) {
        this.get('compressOptions').get(set).get('options').reset();
      }
    }

  });

  // Allow users to drop files into textarea from desktop
  App.DragAndDropView = Ember.TextArea.extend({
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
  App.OutputTextAreaView = Ember.TextArea.extend({
    didInsertElement: function () {
      if (!this.get('parentView.controller.error')) {
        this.$().focus().select();
      }
    }
  });

  window.App = App;

})();
