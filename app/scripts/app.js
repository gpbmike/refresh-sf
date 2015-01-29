(function () {

  'use strict';

  Ember.throttledObserver = function(func, key, time) {
    return Em.observer(function() {
        Em.run.throttle(this, func, time);
    }, key);
  };

  Ember.Handlebars.helper('filesize', function(bytes) {
    var isNegative = bytes < 0;
    bytes = Math.abs(bytes);
    if      (bytes>=1000000000) {bytes=(bytes/1000000000).toFixed(2)+' GB';}
    else if (bytes>=1000000)    {bytes=(bytes/1000000).toFixed(2)+' MB';}
    else if (bytes>=1000)       {bytes=(bytes/1000).toFixed(2)+' KB';}
    else if (bytes>1)           {bytes=bytes+' bytes';}
    else if (bytes==1)          {bytes=bytes+' byte';}
    else                        {bytes='0 byte';}
    return isNegative ? '-' + bytes : bytes;
  });

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
      css: window.cleancssOptions,
      html: window.htmlminifierOptions,
      yui: window.yuiOptions
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

    delta: function () {
      return this.get('output.length') - this.get('input.length');
    }.property('input.length', 'output.length'),

    deltaPercentage: function () {
      return (this.get('delta') / this.get('input.length') * 100).toFixed(2) + '%';
    }.property('input.length', 'delta'),

    isGoodDelta: function () {
      return this.get('delta') < 0;
    }.property('delta'),

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

      if (!window.localStorage.getItem('didCompress')) {
        Ember.$('.btn-group').popover({
          content: 'We try to guess the file type, but do not always get it right. Click your file type to compress when you are ready.',
          placement: 'left'
        }).popover('show');
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

      Ember.$('.btn-group').popover('destroy');
      window.localStorage.setItem('didCompress', true);

      var controller = this;

      this.set('isCompressing', true);

      var timer = Ember.run.later(function () {
        controller.set('isStalled', true);
      }, 5000);

      var minifier = this.get('useYui') && language !== 'html' ? 'yui' : language;

      var options = this.get('compressOptions').get(minifier).get('options').serialize();

      // see what compressors are being used.
      ga('send', 'event', 'compressor', 'compress', minifier);

      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.$.ajax({
          url : controller.get('apiUrl') + minifier + '/',
          type: 'post',
          data: {
            code: controller.get('input'),
            type: controller.get('language'),
            options: options
          },
          dataType: 'json'
        }).done(function (data) {
          resolve(data.code);
        }).fail(function (jqXHR) {
          if (jqXHR.responseJSON.yuiError) {
            reject(jqXHR.responseJSON.yuiError);
          } else {
            reject(JSON.stringify(jqXHR.responseJSON, null, 2));
          }
        }).always(function () {
          controller.set('isCompressing', false);
          controller.set('isStalled', false);
          Ember.run.cancel(timer);
        });
      });
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
        accept: /[text\/*|application\/javascript]/i,
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
