/**
 * BpmnJS library
 */

(function(){
   if (window.BPMN_VIEWER_JS_LOADED === true) return;
   window.BPMN_VIEWER_JS_LOADED = true;
   var script = document.createElement("script");
   script.id = 'bpmn-viewer-script';
   script.src = "https://unpkg.com/bpmn-js@3.1.0/dist/bpmn-navigated-viewer.development.js";
   document.head.appendChild(script);
 })();

var H5P = H5P || {};

H5P.BpmnJS = (function ($) {
  /**
   * Constructor function.
   */
  function C(options, id) {
    this.options = $.extend(true, {}, {
      diagram: '',
    }, options);
    this.id = id;
  }

  /**
   * Attach function called by H5P framework to insert H5P content into
   * page
   *
   * @param {jQuery} $container
   */
  C.prototype.attach = function ($container) {
    var _this = this;

    $container.addClass("h5p-bpmn-js");

    if (window.BpmnJS) {
      this.showDiagram($container);
    } else {
      $('#bpmn-viewer-script', document.head).on('load', function() {
        _this.showDiagram($container);
      });
    }
  };

  /**
   * Build diagram and insert into the container element
   *
   * @param  {jQuery} $container
   */
  C.prototype.showDiagram = function($container) {
    var canvasId = 'canvas-' + this.id;

    $container.append($('<div>', {
      id: canvasId,
      class: 'h5p-bpmn-js-viewer-canvas'
    }));

    var viewer = new BpmnJS({
      container: '#' + canvasId
    });

    // import a BPMN 2.0 diagram
    viewer.importXML(decodeURIComponent(escape(atob(this.options.diagram))), function(err) {
      if (err) {
        console.error(err);
      } else {
        var canvas = viewer.get('canvas');
        canvas.zoom('fit-viewport');
      }
    });
  };

  return C;
})(H5P.jQuery);
