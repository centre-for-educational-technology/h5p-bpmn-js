/**
 * BpmnJS library
 */

var H5P = H5P || {};

H5P.BpmnJS = (function ($, JoubelUI) {
  /**
   * Debounce function
   * @param  {Function} fn      Function to call
   * @param  {integer}  timeout Timeout value
   * @return {Function}         Function with timer logic added
   */
  function debounce(fn, timeout) {

    var timer;

    return function() {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(fn, timeout);
    };
  }

  /**
   * Adds zoom controls to diagram canvas.
   * @param {Object} canvas Canvas instance
   * @param {Object} l10n   Translations
   */
  function add_zoom_controls(canvas, l10n) {
    var max = 4,
      step = 0.2;

    $container = $(canvas.getContainer());
    $controls = $('<div>', {
      class: 'zoom-controls'
    });
    $controls.append($('<div>', {
      class: 'zoom-control reset',
      title: l10n.reset,
      html: '<i class="fa fa-crosshairs" aria-hidden="true"></i>'
    }).on('click', function() {
      canvas.zoom('fit-viewport');
    }));
    $controls.append($('<div>', {
      class: 'zoom-control zoom-in',
      title: l10n.zoomIn,
      html: '<i class="fa fa-search-plus" aria-hidden="true"></i>'
    }).on('click', function() {
      canvas.zoom(Math.min(canvas.zoom(false) + step, max), 'auto');
    }));
    $controls.append($('<div>', {
      class: 'zoom-control zoom-out',
      html: '<i class="fa fa-search-minus" aria-hidden="true"></i>',
      title: l10n.zoomOut,
    }).on('click', function() {
      canvas.zoom(Math.max(canvas.zoom(false) - step, step), 'auto');
    }));

    $container.append($controls);
  }

  /**
   * Constructor function.
   */
  function C(options, id) {
    this.options = $.extend(true, {}, {
      userEditable: false,
      description: '',
      diagram: ''
    }, options);
    this.id = id;
    this.l10n = $.extend({
      downloadDiagram: 'Download diagram',
      downloadSVG: 'Download SVG',
      reset: 'Reset',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out'
    }, options.l10n !== undefined ? options.l10n : {});

    this.loadBpmnAssets();
  }

  /**
   * Loads assets based on BPMN type required.
   */
  C.prototype.loadBpmnAssets = function() {
    var script = document.createElement("script");
    script.id = 'bpmn-script';
    script.src = this.isUserEditable() ? "https://unpkg.com/bpmn-js@3.2.3/dist/bpmn-modeler.production.min.js" : "https://unpkg.com/bpmn-js@3.2.3/dist/bpmn-navigated-viewer.production.min.js";
    document.head.appendChild(script);

    if (this.isUserEditable()) {
      var style1 = document.createElement('link');
      style1.rel = 'stylesheet';
      style1.href = 'https://unpkg.com/bpmn-js@3.2.3/dist/assets/diagram-js.css';
      document.head.appendChild(style1);

      var style2 = document.createElement('link');
      style2.rel = 'stylesheet';
      style2.href = 'https://unpkg.com/bpmn-js@3.2.3/dist/assets/bpmn-font/css/bpmn.css';
      document.head.appendChild(style2);
    }
  };

  /**
   * Determines if diagram should be editable or not.
   *
   * @return {boolean} TRUE if editable, FALSE if not
   */
  C.prototype.isUserEditable = function() {
    return this.options.userEditable;
  };

  /**
   * Build diagram and insert into the container element
   *
   * @param  {jQuery} $container
   */
  C.prototype.showDiagram = function($container) {
    var _this = this;
    var canvasId = 'canvas-' + this.id;

    $container.append($('<div>', {
      id: canvasId,
      class: 'h5p-bpmn-js-canvas'
    }));

    var instanceOptions = {
      container: '#' + canvasId
    };
    if (this.isUserEditable()) {
      instanceOptions = $.extend({
        keyboard: {
          bindTo: window
        }
      }, instanceOptions);
    }

    var instance = new BpmnJS(instanceOptions);

    this.bpmnInstance = instance;

    // import a BPMN 2.0 diagram
    instance.importXML(decodeURIComponent(escape(atob(this.options.diagram))), function(err) {
      if (err) {
        console.error(err);
      } else {
        var canvas = instance.get('canvas');
        canvas.zoom('fit-viewport');

        add_zoom_controls(canvas, _this.l10n);

        setTimeout(function() {
          _this.trigger('bpmnImportFinished');
        }, 500);
      }
    });

    H5P.trigger(this, 'resize');
  };

  /**
   * Build UI elements and insert them into the container.
   *
   * @param  {jQuery} $container Container
   */
  C.prototype.showUI = function($container) {
    this.showDiagram($container);

    if (this.isUserEditable()) {
      var dataPrefix = 'data:application/bpmn20-xml;charset=UTF-8,';

      JoubelUI.createButton({
        class: 'h5p-bpmn-download-diagram-button',
        html: '<i class="fa fa-download" aria-hidden="true"></i>' + this.l10n.downloadDiagram,
        href: dataPrefix,
        download: 'diagram.bpmn',
        appendTo: $container
      });
      JoubelUI.createButton({
        class: 'h5p-bpmn-download-svg-button',
        html: '<i class="fa fa-file-image-o" aria-hidden="true"></i>' + this.l10n.downloadSVG,
        href: dataPrefix,
        download: 'diagram.svg',
        appendTo: $container
      });

      var _this = this;
      var updateDataCb = function(err, data, selector) {
        if (err) {
          return console.error(err);
        }

        $container.find(selector).attr('href', dataPrefix + encodeURIComponent(data));
      };
      var cb = debounce(function() {
        _this.bpmnInstance.saveSVG(function(err, svg) {
          updateDataCb(err, svg, '.h5p-bpmn-download-svg-button');
        });
        _this.bpmnInstance.saveXML({ format: true }, function(err, xml) {
          updateDataCb(err, xml, '.h5p-bpmn-download-diagram-button');
        });
      }, 500);

      this.bpmnInstance.on('commandStack.changed', cb);

      this.once('bpmnImportFinished', function(e) {
        cb();
      });
    }
  };

  /**
   * Attach function called by H5P framework to insert H5P content into
   * page
   *
   * @param {jQuery} $container
   */
  C.prototype.attach = function ($container) {
    var _this = this;

    $container.addClass("h5p-bpmn-js");

    $container.append($('<div>', {
      class: 'h5p-bpmn-js-description',
      html: this.options.description
    }));

    if (window.BpmnJS) {
      this.showUI($container);
    } else {
      $('#bpmn-script', document.head).on('load', function() {
        _this.showUI($container);
      });
    }
  };

  return C;
})(H5P.jQuery, H5P.JoubelUI);
