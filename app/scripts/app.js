(function () {

  'use strict';

  Ember.debouncedObserver = function(func, key, time) {
    return Em.observer(function() {
        Em.run.debounce(this, func, time);
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
      javascript : window.uglifyOptions,
      css        : window.cleancssOptions,
      html       : window.htmlminifierOptions,
      yui        : window.yuiOptions
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

    gzipSize: function () {
      return this.get('gzipBlob') ? this.get('gzipBlob').size : null;
    }.property('gzipBlob'),

    delta: function () {
      return this.get('gzipSize') - this.get('input.length');
    }.property('input.length', 'gzipSize'),

    deltaPercentage: function () {
      return (this.get('delta') / this.get('input.length') * 100).toFixed(2) + '%';
    }.property('input.length', 'delta'),

    isGoodDelta: function () {
      return this.get('delta') < 0;
    }.property('delta'),

    checkLanguage: Ember.debouncedObserver(function () {

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
          dataType: 'json',
          crossDomain: true
        }).done(function (data) {
          resolve(data.code);
        }).fail(function (jqXHR, textStatus, error) {
          if (jqXHR.status === 413) {
            reject('There is a 1MB input limit to reduce strain on my free Heroku instance.');
          } else if (!jqXHR.responseJSON) {
            reject('Unhandled error. :( ' + error);
          } else if (jqXHR.responseJSON.yuiError) {
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

        var controller = this;

        language = language || this.get('language');

        this.set('output', null);
        this.set('gzipBlob', null);
        this.set('error', null);

        this.compress(language).then(function (code) {

          controller.set('output', code);

          if (controller.get('filename')) {
            return;
          }

          switch (language) {
          case 'css':
            controller.set('filename', 'style.min.css');
            break;
          case 'javascript':
            controller.set('filename', 'app.min.js');
            break;
          case 'html':
            controller.set('filename', 'index.min.html');
            break;
          }

        }, function (error) {

          controller.set('error', true);
          controller.set('output', error);

        }).then(function () {

          var req = new XMLHttpRequest();
          req.open('POST', window.ENV.apiUrl + 'gz/auto.js');
          req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
          req.responseType = 'blob';

          req.onreadystatechange = function () {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {

                controller.set('gzipBlob', this.response);
              }
            }
          }

          req.send("code=%@".fmt(escape(controller.get('output'))));

        });
      },

      save: function () {
        ga('send', 'event', 'compressor', 'save', 'output');
        var blob = new Blob([this.get('output')], {type: 'text/' + this.get('language') + ';charset=utf-8'});
        saveAs(blob, this.get('filename'));
      },

      saveGzip: function () {
        ga('send', 'event', 'compressor', 'save', 'compressed');
        saveAs(this.get('gzipBlob'), this.get('filename') + '.gz');
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

(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-2329903-2', 'auto');
ga('send', 'pageview');

(function () {
UserVoice=window.UserVoice||[];(function(){var uv=document.createElement('script');uv.type='text/javascript';uv.async=true;uv.src='//widget.uservoice.com/BT8u2dIQuWVZSuXHaxKIQ.js';var s=document.getElementsByTagName('script')[0];s.parentNode.insertBefore(uv,s)})();
UserVoice.push(['addTrigger', { mode: 'contact', trigger_position: 'bottom-right' }]);
})();
