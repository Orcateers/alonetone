(function($) {
  
  //If the UI scope is not available, add it
  $.ui = $.ui || {};
  
  //Add methods that are vital for all mouse interaction stuff (plugin registering)
  $.extend($.ui, {
    plugin: {
      add: function(module, option, set) {
        var proto = $.ui[module].prototype;
        for(var i in set) {
          proto.plugins[i] = proto.plugins[i] || [];
          proto.plugins[i].push([option, set[i]]);
        }
      },
      call: function(instance, name, arguments) {
        var set = instance.plugins[name]; if(!set) return;
        for (var i = 0; i < set.length; i++) {
          if (instance.options[set[i][0]]) set[i][1].apply(instance.element, arguments);
        }
      } 
    },
    cssCache: {},
    css: function(name) {
      if ($.ui.cssCache[name]) return $.ui.cssCache[name];
      
      var tmp = $('<div class="ui-resizable-gen">').addClass(name).css(
        {position:'absolute', top:'-5000px', left:'-5000px', display:'block'}
      ).appendTo('body');
      
      //Opera and Safari set width and height to 0px instead of auto
      //Safari returns rgba(0,0,0,0) when bgcolor is not set
      $.ui.cssCache[name] = !!(
        ((/^[1-9]/).test(tmp.css('height')) || (/^[1-9]/).test(tmp.css('width')) || 
        !(/none/).test(tmp.css('backgroundImage')) || !(/transparent|rgba\(0, 0, 0, 0\)/).test(tmp.css('backgroundColor')))
      );
      try { $('body').get(0).removeChild(tmp.get(0)); } catch(e){}
      return $.ui.cssCache[name];
    },
    disableSelection: function(e) {
      if (!e) return;
      e.unselectable = "on";
      e.onselectstart = function() {  return false; };
      if (e.style) e.style.MozUserSelect = "none";
    },
    enableSelection: function(e) {
      if (!e) return;
      e.unselectable = "off";
      e.onselectstart = function() { return true; };
      if (e.style) e.style.MozUserSelect = "";
    },
    hasScroll: function(e, a) {
      var scroll = /top/.test(a||"top") ? 'scrollTop' : 'scrollLeft', has = false;
      if (e[scroll] > 0) return true; e[scroll] = 1;
      has = e[scroll] > 0 ? true : false; e[scroll] = 0;
      return has; 
    }
  });
  
  /********************************************************************************************************/

  $.fn.extend({
    mouseInteraction: function(o) {
      return this.each(function() {
        new $.ui.mouseInteraction(this, o);
      });
    },
    removeMouseInteraction: function(o) {
      return this.each(function() {
        if($.data(this, "ui-mouse"))
          $.data(this, "ui-mouse").destroy();
      });
    }
  });
  
  /********************************************************************************************************/
  
  $.ui.mouseInteraction = function(element, options) {
  
    var self = this;
    this.element = element;
    $.data(this.element, "ui-mouse", this);
    this.options = $.extend({}, options);
    
    $(element).bind('mousedown.draggable', function() { return self.click.apply(self, arguments); });
    if($.browser.msie) $(element).attr('unselectable', 'on'); //Prevent text selection in IE
    
  };
  
  $.extend($.ui.mouseInteraction.prototype, {
    
    destroy: function() { $(this.element).unbind('mousedown.draggable'); },
    trigger: function() { return this.click.apply(this, arguments); },
    click: function(e) {
      
      if(
           e.which != 1 //only left click starts dragging
        || $.inArray(e.target.nodeName.toLowerCase(), this.options.dragPrevention) != -1 // Prevent execution on defined elements
        || (this.options.condition && !this.options.condition.apply(this.options.executor || this, [e, this.element])) //Prevent execution on condition
      ) return true;
      
      var self = this;
      var initialize = function() {
        self._MP = { left: e.pageX, top: e.pageY }; // Store the click mouse position
        $(document).bind('mouseup.draggable', function() { return self.stop.apply(self, arguments); });
        $(document).bind('mousemove.draggable', function() { return self.drag.apply(self, arguments); });
      };

      if(this.options.delay) {
        if(this.timer) clearInterval(this.timer);
        this.timer = setTimeout(initialize, this.options.delay);
      } else {
        initialize();
      }
      
      return false;
      
    },
    stop: function(e) {     
      
      var o = this.options;
      if(!this.initialized) return $(document).unbind('mouseup.draggable').unbind('mousemove.draggable');

      if(this.options.stop) this.options.stop.call(this.options.executor || this, e, this.element);
      $(document).unbind('mouseup.draggable').unbind('mousemove.draggable');
      this.initialized = false;
      return false;
      
    },
    drag: function(e) {

      var o = this.options;
      if ($.browser.msie && !e.button) return this.stop.apply(this, [e]); // IE mouseup check
      
      if(!this.initialized && (Math.abs(this._MP.left-e.pageX) >= o.distance || Math.abs(this._MP.top-e.pageY) >= o.distance)) {
        if(this.options.start) this.options.start.call(this.options.executor || this, e, this.element);
        this.initialized = true;
      } else {
        if(!this.initialized) return false;
      }

      if(o.drag) o.drag.call(this.options.executor || this, e, this.element);
      return false;
      
    }
  });

 })(jQuery);

(function($) {

  $.fn.extend({
    draggable: function(options) {
      var args = Array.prototype.slice.call(arguments, 1);
      
      return this.each(function() {
        if (typeof options == "string") {
          var drag = $.data(this, "ui-draggable");
          drag[options].apply(drag, args);

        } else if(!$.data(this, "ui-draggable"))
          new $.ui.draggable(this, options);
      });
    }
  });
  
  $.ui.draggable = function(element, options) {
    //Initialize needed constants
    var self = this;
    
    this.element = $(element);
    
    $.data(element, "ui-draggable", this);
    this.element.addClass("ui-draggable");
    
    //Prepare the passed options
    this.options = $.extend({}, options);
    var o = this.options;
    $.extend(o, {
      helper: o.ghosting == true ? 'clone' : (o.helper || 'original'),
      handle : o.handle ? ($(o.handle, element)[0] ? $(o.handle, element) : this.element) : this.element,
      appendTo: o.appendTo || 'parent'    
    });
    
    $(element).bind("setData.draggable", function(event, key, value){
      self.options[key] = value;
    }).bind("getData.draggable", function(event, key){
      return self.options[key];
    });
    
    //Initialize mouse events for interaction
    $(o.handle).mouseInteraction({
      executor: this,
      delay: o.delay,
      distance: o.distance || 0,
      dragPrevention: o.prevention ? o.prevention.toLowerCase().split(',') : ['input','textarea','button','select','option'],
      start: this.start,
      stop: this.stop,
      drag: this.drag,
      condition: function(e) { return !(e.target.className.indexOf("ui-resizable-handle") != -1 || this.disabled); }
    });
    
    //Position the node
    if(o.helper == 'original' && (this.element.css('position') == 'static' || this.element.css('position') == ''))
      this.element.css('position', 'relative');
    
  };
  
  $.extend($.ui.draggable.prototype, {
    plugins: {},
    ui: function(e) {
      return {
        helper: this.helper,
        position: this.position,
        absolutePosition: this.positionAbs,
        instance: this,
        options: this.options,
        element: this.element       
      };
    },
    propagate: function(n,e) {
      $.ui.plugin.call(this, n, [e, this.ui()]);
      return this.element.triggerHandler(n == "drag" ? n : "drag"+n, [e, this.ui()], this.options[n]);
    },
    destroy: function() {
      this.handle.removeMouseInteraction();
      this.element
        .removeClass("ui-draggable ui-draggable-disabled")
        .removeData("ui-draggable")
        .unbind(".draggable");
    },
    enable: function() {
      this.element.removeClass("ui-draggable-disabled");
      this.disabled = false;
    },
    disable: function() {
      this.element.addClass("ui-draggable-disabled");
      this.disabled = true;
    },
    recallOffset: function(e) {

      var elementPosition = { left: this.elementOffset.left - this.offsetParentOffset.left, top: this.elementOffset.top - this.offsetParentOffset.top };
      var r = this.helper.css('position') == 'relative';

      //Generate the original position
      this.originalPosition = {
        left: (r ? parseInt(this.helper.css('left'),10) || 0 : elementPosition.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft)),
        top: (r ? parseInt(this.helper.css('top'),10) || 0 : elementPosition.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop))
      };
      
      //Generate a flexible offset that will later be subtracted from e.pageX/Y
      this.offset = {left: this._pageX - this.originalPosition.left, top: this._pageY - this.originalPosition.top };
      
    },
    start: function(e) {
      
      var o = this.options;
      if($.ui.ddmanager) $.ui.ddmanager.current = this;
      
      //Create and append the visible helper
      this.helper = typeof o.helper == 'function' ? $(o.helper.apply(this.element[0], [e])) : (o.helper == 'clone' ? this.element.clone().appendTo((o.appendTo == 'parent' ? this.element[0].parentNode : o.appendTo)) : this.element);
      if(this.helper[0] != this.element[0]) this.helper.css('position', 'absolute');
      if(!this.helper.parents('body').length) this.helper.appendTo((o.appendTo == 'parent' ? this.element[0].parentNode : o.appendTo));

      //Find out the next positioned parent
      this.offsetParent = (function(cp) {
        while(cp) {
          if(cp.style && (/(absolute|relative|fixed)/).test($.css(cp,'position'))) return $(cp);
          cp = cp.parentNode ? cp.parentNode : null;
        }; return $("body");    
      })(this.helper[0].parentNode);
      
      //Prepare variables for position generation
      this.elementOffset = this.element.offset();
      this.offsetParentOffset = this.offsetParent.offset();
      var elementPosition = { left: this.elementOffset.left - this.offsetParentOffset.left, top: this.elementOffset.top - this.offsetParentOffset.top };
      this._pageX = e.pageX; this._pageY = e.pageY;
      this.clickOffset = { left: e.pageX - this.elementOffset.left, top: e.pageY - this.elementOffset.top };
      var r = this.helper.css('position') == 'relative';

      //Generate the original position
      this.originalPosition = {
        left: (r ? parseInt(this.helper.css('left'),10) || 0 : elementPosition.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft)),
        top: (r ? parseInt(this.helper.css('top'),10) || 0 : elementPosition.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop))
      };
      
      //If we have a fixed element, we must subtract the scroll offset again
      if(this.element.css('position') == 'fixed') {
        this.originalPosition.top -= this.offsetParent[0] == document.body ? $(document).scrollTop() : this.offsetParent[0].scrollTop;
        this.originalPosition.left -= this.offsetParent[0] == document.body ? $(document).scrollLeft() : this.offsetParent[0].scrollLeft;
      }
      
      //Generate a flexible offset that will later be subtracted from e.pageX/Y
      this.offset = {left: e.pageX - this.originalPosition.left, top: e.pageY - this.originalPosition.top };
      
      //Substract margins
      if(this.element[0] != this.helper[0]) {
        this.offset.left += parseInt(this.element.css('marginLeft'),10) || 0;
        this.offset.top += parseInt(this.element.css('marginTop'),10) || 0;
      }

      
      //Call plugins and callbacks
      this.propagate("start", e);

      this.helperProportions = { width: this.helper.outerWidth(), height: this.helper.outerHeight() };
      if ($.ui.ddmanager && !o.dropBehaviour) $.ui.ddmanager.prepareOffsets(this, e);
      
      //If we have something in cursorAt, we'll use it
      if(o.cursorAt) {
        if(o.cursorAt.top != undefined || o.cursorAt.bottom != undefined) {
          this.offset.top -= this.clickOffset.top - (o.cursorAt.top != undefined ? o.cursorAt.top : (this.helperProportions.height - o.cursorAt.bottom));
          this.clickOffset.top = (o.cursorAt.top != undefined ? o.cursorAt.top : (this.helperProportions.height - o.cursorAt.bottom));
        }
        if(o.cursorAt.left != undefined || o.cursorAt.right != undefined) {
          this.offset.left -= this.clickOffset.left - (o.cursorAt.left != undefined ? o.cursorAt.left : (this.helperProportions.width - o.cursorAt.right));
          this.clickOffset.left = (o.cursorAt.left != undefined ? o.cursorAt.left : (this.helperProportions.width - o.cursorAt.right));
        }
      }

      return false;

    },
    clear: function() {
      if($.ui.ddmanager) $.ui.ddmanager.current = null;
      this.helper = null;
    },
    stop: function(e) {

      //If we are using droppables, inform the manager about the drop
      if ($.ui.ddmanager && !this.options.dropBehaviour)
        $.ui.ddmanager.drop(this, e);
        
      //Call plugins and trigger callbacks
      this.propagate("stop", e);
      
      if(this.cancelHelperRemoval) return false;      
      if(this.options.helper != 'original') this.helper.remove();
      this.clear();

      return false;
    },
    drag: function(e) {

      //Compute the helpers position
      this.position = { top: e.pageY - this.offset.top, left: e.pageX - this.offset.left };
      this.positionAbs = { left: e.pageX - this.clickOffset.left, top: e.pageY - this.clickOffset.top };

      //Call plugins and callbacks      
      this.position = this.propagate("drag", e) || this.position;
      
      this.helper.css({ left: this.position.left+'px', top: this.position.top+'px' }); // Stick the helper to the cursor
      if($.ui.ddmanager) $.ui.ddmanager.drag(this, e);
      return false;
      
    }
  });

})(jQuery);

/*
 * 'this' -> original element
 * 1. argument: browser event
 * 2.argument: ui object
 */

(function($) {

  $.ui.plugin.add("draggable", "cursor", {
    start: function(e,ui) {
      var t = $('body');
      if (t.css("cursor")) ui.options._cursor = t.css("cursor");
      t.css("cursor", ui.options.cursor);
    },
    stop: function(e,ui) {
      if (ui.options._cursor) $('body').css("cursor", ui.options._cursor);
    }
  });

  $.ui.plugin.add("draggable", "zIndex", {
    start: function(e,ui) {
      var t = $(ui.helper);
      if(t.css("zIndex")) ui.options._zIndex = t.css("zIndex");
      t.css('zIndex', ui.options.zIndex);
    },
    stop: function(e,ui) {
      if(ui.options._zIndex) $(ui.helper).css('zIndex', ui.options._zIndex);
    }
  });

  $.ui.plugin.add("draggable", "opacity", {
    start: function(e,ui) {
      var t = $(ui.helper);
      if(t.css("opacity")) ui.options._opacity = t.css("opacity");
      t.css('opacity', ui.options.opacity);
    },
    stop: function(e,ui) {
      if(ui.options._opacity) $(ui.helper).css('opacity', ui.options._opacity);
    }
  });


  $.ui.plugin.add("draggable", "revert", {
    stop: function(e,ui) {
      var self = ui.instance;
      self.cancelHelperRemoval = true;
      $(ui.helper).animate({ left: self.originalPosition.left, top: self.originalPosition.top }, parseInt(ui.options.revert, 10) || 500, function() {
        if(ui.options.helper != 'original') self.helper.remove();
        self.clear();
      });
    }
  });

  $.ui.plugin.add("draggable", "iframeFix", {
    start: function(e,ui) {

      var o = ui.options;
      if(ui.instance.slowMode) return; // Make clones on top of iframes (only if we are not in slowMode)
      
      if(o.iframeFix.constructor == Array) {
        for(var i=0;i<o.iframeFix.length;i++) {
          var co = $(o.iframeFix[i]).offset({ border: false });
          $('<div class="DragDropIframeFix"" style="background: #fff;"></div>').css("width", $(o.iframeFix[i])[0].offsetWidth+"px").css("height", $(o.iframeFix[i])[0].offsetHeight+"px").css("position", "absolute").css("opacity", "0.001").css("z-index", "1000").css("top", co.top+"px").css("left", co.left+"px").appendTo("body");
        }   
      } else {
        $("iframe").each(function() {         
          var co = $(this).offset({ border: false });
          $('<div class="DragDropIframeFix" style="background: #fff;"></div>').css("width", this.offsetWidth+"px").css("height", this.offsetHeight+"px").css("position", "absolute").css("opacity", "0.001").css("z-index", "1000").css("top", co.top+"px").css("left", co.left+"px").appendTo("body");
        });             
      }

    },
    stop: function(e,ui) {
      if(ui.options.iframeFix) $("div.DragDropIframeFix").each(function() { this.parentNode.removeChild(this); }); //Remove frame helpers 
    }
  });
  
  $.ui.plugin.add("draggable", "containment", {
    start: function(e,ui) {

      var o = ui.options;
      if((o.containment.left != undefined || o.containment.constructor == Array) && !o._containment) return;
      if(!o._containment) o._containment = o.containment;

      if(o._containment == 'parent') o._containment = this[0].parentNode;
      if(o._containment == 'document') {
        o.containment = [
          0,
          0,
          $(document).width(),
          ($(document).height() || document.body.parentNode.scrollHeight)
        ];
      } else { //I'm a node, so compute top/left/right/bottom

        var ce = $(o._containment)[0];
        var co = $(o._containment).offset();

        o.containment = [
          co.left,
          co.top,
          co.left+(ce.offsetWidth || ce.scrollWidth),
          co.top+(ce.offsetHeight || ce.scrollHeight)
        ];
      }

    },
    drag: function(e,ui) {

      var o = ui.options;
      var h = ui.helper;
      var c = o.containment;
      var self = ui.instance;
      
      if(c.constructor == Array) {
        if((ui.absolutePosition.left < c[0])) self.position.left = c[0] - (self.offset.left - self.clickOffset.left);
        if((ui.absolutePosition.top < c[1])) self.position.top = c[1] - (self.offset.top - self.clickOffset.top);
        if(ui.absolutePosition.left - c[2] + self.helperProportions.width >= 0) self.position.left = c[2] - (self.offset.left - self.clickOffset.left) - self.helperProportions.width;
        if(ui.absolutePosition.top - c[3] + self.helperProportions.height >= 0) self.position.top = c[3] - (self.offset.top - self.clickOffset.top) - self.helperProportions.height;
      } else {
        if((ui.position.left < c.left)) self.position.left = c.left;
        if((ui.position.top < c.top)) self.position.top = c.top;
        if(ui.position.left - self.offsetParent.innerWidth() + self.helperProportions.width + c.right + (parseInt(self.offsetParent.css("borderLeftWidth"), 10) || 0) + (parseInt(self.offsetParent.css("borderRightWidth"), 10) || 0) >= 0) self.position.left = self.offsetParent.innerWidth() - self.helperProportions.width - c.right - (parseInt(self.offsetParent.css("borderLeftWidth"), 10) || 0) - (parseInt(self.offsetParent.css("borderRightWidth"), 10) || 0);
        if(ui.position.top - self.offsetParent.innerHeight() + self.helperProportions.height + c.bottom + (parseInt(self.offsetParent.css("borderTopWidth"), 10) || 0) + (parseInt(self.offsetParent.css("borderBottomWidth"), 10) || 0) >= 0) self.position.top = self.offsetParent.innerHeight() - self.helperProportions.height - c.bottom - (parseInt(self.offsetParent.css("borderTopWidth"), 10) || 0) - (parseInt(self.offsetParent.css("borderBottomWidth"), 10) || 0);
      }

    }
  });

  $.ui.plugin.add("draggable", "grid", {
    drag: function(e,ui) {
      var o = ui.options;
      ui.instance.position.left = ui.instance.originalPosition.left + Math.round((e.pageX - ui.instance._pageX) / o.grid[0]) * o.grid[0];
      ui.instance.position.top = ui.instance.originalPosition.top + Math.round((e.pageY - ui.instance._pageY) / o.grid[1]) * o.grid[1];
    }
  });

  $.ui.plugin.add("draggable", "axis", {
    drag: function(e,ui) {
      var o = ui.options;
      if(o.constraint) o.axis = o.constraint; //Legacy check
      o.axis == 'x' ? ui.instance.position.top = ui.instance.originalPosition.top : ui.instance.position.left = ui.instance.originalPosition.left;
    }
  });

  $.ui.plugin.add("draggable", "scroll", {
    start: function(e,ui) {
      var o = ui.options;
      o.scrollSensitivity = o.scrollSensitivity || 20;
      o.scrollSpeed   = o.scrollSpeed || 20;

      ui.instance.overflowY = function(el) {
        do { if(/auto|scroll/.test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-y'))) return el; el = el.parent(); } while (el[0].parentNode);
        return $(document);
      }(this);
      ui.instance.overflowX = function(el) {
        do { if(/auto|scroll/.test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-x'))) return el; el = el.parent(); } while (el[0].parentNode);
        return $(document);
      }(this);
    },
    drag: function(e,ui) {
      
      var o = ui.options;
      var i = ui.instance;

      if(i.overflowY[0] != document && i.overflowY[0].tagName != 'HTML') {
        if(i.overflowY[0].offsetHeight - (ui.position.top - i.overflowY[0].scrollTop + i.clickOffset.top) < o.scrollSensitivity)
          i.overflowY[0].scrollTop = i.overflowY[0].scrollTop + o.scrollSpeed;
        if((ui.position.top - i.overflowY[0].scrollTop + i.clickOffset.top) < o.scrollSensitivity)
          i.overflowY[0].scrollTop = i.overflowY[0].scrollTop - o.scrollSpeed;        
      } else {
        //$(document.body).append('<p>'+(e.pageY - $(document).scrollTop())+'</p>');
        if(e.pageY - $(document).scrollTop() < o.scrollSensitivity)
          $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
        if($(window).height() - (e.pageY - $(document).scrollTop()) < o.scrollSensitivity)
          $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
      }
      
      if(i.overflowX[0] != document && i.overflowX[0].tagName != 'HTML') {
        if(i.overflowX[0].offsetWidth - (ui.position.left - i.overflowX[0].scrollLeft + i.clickOffset.left) < o.scrollSensitivity)
          i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft + o.scrollSpeed;
        if((ui.position.top - i.overflowX[0].scrollLeft + i.clickOffset.left) < o.scrollSensitivity)
          i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft - o.scrollSpeed;        
      } else {
        if(e.pageX - $(document).scrollLeft() < o.scrollSensitivity)
          $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
        if($(window).width() - (e.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
          $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
      }
      
      ui.instance.recallOffset(e);

    }
  });
  
  $.ui.plugin.add("draggable", "snap", {
    start: function(e,ui) {
      
      ui.instance.snapElements = [];
      $(ui.options.snap === true ? '.ui-draggable' : ui.options.snap).each(function() {
        var $t = $(this); var $o = $t.offset();
        if(this != ui.instance.element[0]) ui.instance.snapElements.push({
          item: this,
          width: $t.outerWidth(),
          height: $t.outerHeight(),
          top: $o.top,
          left: $o.left
        });
      });
      
    },
    drag: function(e,ui) {

      var d = ui.options.snapTolerance || 20;
      var x1 = ui.absolutePosition.left, x2 = x1 + ui.instance.helperProportions.width,
          y1 = ui.absolutePosition.top, y2 = y1 + ui.instance.helperProportions.height;

      for (var i = ui.instance.snapElements.length - 1; i >= 0; i--){

        var l = ui.instance.snapElements[i].left, r = l + ui.instance.snapElements[i].width, 
            t = ui.instance.snapElements[i].top,  b = t + ui.instance.snapElements[i].height;

        //Yes, I know, this is insane ;)
        if(!((l-d < x1 && x1 < r+d && t-d < y1 && y1 < b+d) || (l-d < x1 && x1 < r+d && t-d < y2 && y2 < b+d) || (l-d < x2 && x2 < r+d && t-d < y1 && y1 < b+d) || (l-d < x2 && x2 < r+d && t-d < y2 && y2 < b+d))) continue;

        if(ui.options.snapMode != 'inner') {
          var ts = Math.abs(t - y2) <= 20;
          var bs = Math.abs(b - y1) <= 20;
          var ls = Math.abs(l - x2) <= 20;
          var rs = Math.abs(r - x1) <= 20;
          if(ts) ui.position.top = t - ui.instance.offset.top + ui.instance.clickOffset.top - ui.instance.helperProportions.height;
          if(bs) ui.position.top = b - ui.instance.offset.top + ui.instance.clickOffset.top;
          if(ls) ui.position.left = l - ui.instance.offset.left + ui.instance.clickOffset.left - ui.instance.helperProportions.width;
          if(rs) ui.position.left = r - ui.instance.offset.left + ui.instance.clickOffset.left;
        }
        
        if(ui.options.snapMode != 'outer') {
          var ts = Math.abs(t - y1) <= 20;
          var bs = Math.abs(b - y2) <= 20;
          var ls = Math.abs(l - x1) <= 20;
          var rs = Math.abs(r - x2) <= 20;
          if(ts) ui.position.top = t - ui.instance.offset.top + ui.instance.clickOffset.top;
          if(bs) ui.position.top = b - ui.instance.offset.top + ui.instance.clickOffset.top - ui.instance.helperProportions.height;
          if(ls) ui.position.left = l - ui.instance.offset.left + ui.instance.clickOffset.left;
          if(rs) ui.position.left = r - ui.instance.offset.left + ui.instance.clickOffset.left - ui.instance.helperProportions.width;
        }

      };
    }
  });

  //TODO: wrapHelper, snap

})(jQuery);

(function($) {

  $.fn.extend({
    droppable: function(options) {
      var args = Array.prototype.slice.call(arguments, 1);
      
      return this.each(function() {
        if (typeof options == "string") {
          var drop = $.data(this, "ui-droppable");
          drop[options].apply(drop, args);

        } else if(!$.data(this, "ui-droppable"))
          new $.ui.droppable(this, options);
      });
    }
  });

  
  $.ui.droppable = function(element, options) {

    //Initialize needed constants     
    this.element = $(element);
    $.data(element, "ui-droppable", this);
    this.element.addClass("ui-droppable");    
    
    //Prepare the passed options
    this.options = $.extend({}, options);
    var o = this.options; var accept = o.accept;
    $.extend(o, {
      accept: o.accept && o.accept.constructor == Function ? o.accept : function(d) {
        return $(d).is(accept); 
      },
      tolerance: o.tolerance || 'intersect'   
    });
    
    $(element).bind("setData.draggable", function(event, key, value){
      o[key] = value;
    }).bind("getData.draggable", function(event, key){
      return o[key];
    });
    
    //Store the droppable's proportions
    this.proportions = { width: this.element.outerWidth(), height: this.element.outerHeight() };
    
    // Add the reference and positions to the manager
    $.ui.ddmanager.droppables.push({ item: this, over: 0, out: 1 });
      
  };
  
  $.extend($.ui.droppable.prototype, {
    plugins: {},
    ui: function(c) {
      return {
        instance: this,
        draggable: c.element,
        helper: c.helper,
        position: c.position,
        absolutePosition: c.positionAbs,
        options: this.options,
        element: this.element 
      };    
    },
    destroy: function() {
      var drop = $.ui.ddmanager.droppables;
      for ( var i = 0; i < drop.length; i++ )
        if ( drop[i].item == this )
          drop.splice(i, 1);
      
      this.element
        .removeClass("ui-droppable ui-droppable-disabled")
        .removeData("ui-droppable")
        .unbind(".droppable");
    },
    enable: function() {
      this.element.removeClass("ui-droppable-disabled");
      this.disabled = false;
    },
    disable: function() {
      this.element.addClass("ui-droppable-disabled");
      this.disabled = true;
    },
    over: function(e) {

      var draggable = $.ui.ddmanager.current;
      if (!draggable || draggable.element[0] == this.element[0]) return; // Bail if draggable and droppable are same element
      
      if (this.options.accept.call(this.element,draggable.element)) {
        $.ui.plugin.call(this, 'over', [e, this.ui(draggable)]);
        this.element.triggerHandler("dropover", [e, this.ui(draggable)], this.options.over);
      }
      
    },
    out: function(e) {

      var draggable = $.ui.ddmanager.current;
      if (!draggable || draggable.element[0] == this.element[0]) return; // Bail if draggable and droppable are same element

      if (this.options.accept.call(this.element,draggable.element)) {
        $.ui.plugin.call(this, 'out', [e, this.ui(draggable)]);
        this.element.triggerHandler("dropout", [e, this.ui(draggable)], this.options.out);
      }
      
    },
    drop: function(e) {

      var draggable = $.ui.ddmanager.current;
      if (!draggable || draggable.element[0] == this.element[0]) return; // Bail if draggable and droppable are same element
      
      if(this.options.accept.call(this.element,draggable.element)) {
        $.ui.plugin.call(this, 'drop', [e, this.ui(draggable)]);
        this.element.triggerHandler("drop", [e, this.ui(draggable)], this.options.drop);
      }
      
    },
    activate: function(e) {

      var draggable = $.ui.ddmanager.current;
      $.ui.plugin.call(this, 'activate', [e, this.ui(draggable)]);
      if(draggable) this.element.triggerHandler("dropactivate", [e, this.ui(draggable)], this.options.activate);
        
    },
    deactivate: function(e) {
      
      var draggable = $.ui.ddmanager.current;
      $.ui.plugin.call(this, 'deactivate', [e, this.ui(draggable)]);
      if(draggable) this.element.triggerHandler("dropdeactivate", [e, this.ui(draggable)], this.options.deactivate);
      
    }
  });
  
  $.ui.intersect = function(draggable, droppable, toleranceMode) {

    if (!droppable.offset) return false;
    
    var x1 = draggable.positionAbs.left, x2 = x1 + draggable.helperProportions.width,
        y1 = draggable.positionAbs.top, y2 = y1 + draggable.helperProportions.height;
    var l = droppable.offset.left, r = l + droppable.item.proportions.width, 
        t = droppable.offset.top,  b = t + droppable.item.proportions.height;

    switch (toleranceMode) {
      case 'fit':
        return (   l < x1 && x2 < r
          && t < y1 && y2 < b);
        break;
      case 'intersect':
        return (   l < x1 + (draggable.helperProportions.width  / 2)        // Right Half
          &&     x2 - (draggable.helperProportions.width  / 2) < r    // Left Half
          && t < y1 + (draggable.helperProportions.height / 2)        // Bottom Half
          &&     y2 - (draggable.helperProportions.height / 2) < b ); // Top Half
        break;
      case 'pointer':
        return (   l < (draggable.positionAbs.left + draggable.clickOffset.left) && (draggable.positionAbs.left + draggable.clickOffset.left) < r
          && t < (draggable.positionAbs.top + draggable.clickOffset.top) && (draggable.positionAbs.top + draggable.clickOffset.top) < b);
        break;
      case 'touch':
        return (   (l < x1 && x1 < r && t < y1 && y1 < b)    // Top-Left Corner
          || (l < x1 && x1 < r && t < y2 && y2 < b)    // Bottom-Left Corner
          || (l < x2 && x2 < r && t < y1 && y1 < b)    // Top-Right Corner
          || (l < x2 && x2 < r && t < y2 && y2 < b) ); // Bottom-Right Corner
        break;
      default:
        return false;
        break;
      }
    
  };
  
  /*
    This manager tracks offsets of draggables and droppables
  */
  $.ui.ddmanager = {
    current: null,
    droppables: [],
    prepareOffsets: function(t, e) {

      var m = $.ui.ddmanager.droppables;
      for (var i = 0; i < m.length; i++) {
        
        if(m[i].item.disabled || (t && !m[i].item.options.accept.call(m[i].item.element,t.element))) continue;
        m[i].offset = $(m[i].item.element).offset();
        
        if(t) m[i].item.activate.call(m[i].item, e); //Activate the droppable if used directly from draggables
          
      }
      
    },
    drop: function(draggable, e) {
      
      $.each($.ui.ddmanager.droppables, function() {
        
        if (!this.item.disabled && $.ui.intersect(draggable, this, this.item.options.tolerance))
          this.item.drop.call(this.item, e);
          
        if (!this.item.disabled && this.item.options.accept.call(this.item.element,draggable.element)) {
          this.out = 1; this.over = 0;
          this.item.deactivate.call(this.item, e);
        }
        
      });
      
    },
    drag: function(draggable, e) {
      
      //If you have a highly dynamic page, you might try this option. It renders positions every time you move the mouse.
      if(draggable.options.refreshPositions) $.ui.ddmanager.prepareOffsets();
    
      //Run through all draggables and check their positions based on specific tolerance options
      $.each($.ui.ddmanager.droppables, function() {

        if(this.item.disabled) return false; 
        var intersects = $.ui.intersect(draggable, this, this.item.options.tolerance);

        var c = !intersects && this.over == 1 ? 'out' : (intersects && this.over == 0 ? 'over' : null);
        if(!c) return;
          
        this[c] = 1; this[c == 'out' ? 'over' : 'out'] = 0;
        this.item[c].call(this.item, e);
          
      });
      
    }
  };
  
})(jQuery);

(function($) {

  $.ui.plugin.add("droppable", "activeClass", {
    activate: function(e,ui) {
      $(this).addClass(ui.options.activeClass);
    },
    deactivate: function(e,ui) {
      $(this).removeClass(ui.options.activeClass);
    },
    drop: function(e,ui) {
      $(this).removeClass(ui.options.activeClass);
    }
  });

  $.ui.plugin.add("droppable", "hoverClass", {
    over: function(e,ui) {
      $(this).addClass(ui.options.hoverClass);
    },
    out: function(e,ui) {
      $(this).removeClass(ui.options.hoverClass);
    },
    drop: function(e,ui) {
      $(this).removeClass(ui.options.hoverClass);
    }
  }); 

})(jQuery);

(function($) {

  if (window.Node && Node.prototype && !Node.prototype.contains) {
    Node.prototype.contains = function (arg) {
      return !!(this.compareDocumentPosition(arg) & 16);
    };
  }

  $.fn.extend({
    sortable: function(options) {
      
      var args = Array.prototype.slice.call(arguments, 1);
      
      if (options == "serialize" || options == "toArray")
        return $.data(this[0], "ui-sortable")[options](arguments[1]);
      
      return this.each(function() {
        if (typeof options == "string") {
          var sort = $.data(this, "ui-sortable");
          sort[options].apply(sort, args);

        } else if(!$.data(this, "ui-sortable"))
          new $.ui.sortable(this, options);
      });
    }
  });
  
  $.ui.sortable = function(element, options) {
    //Initialize needed constants
    var self = this;
    
    this.element = $(element);
    
    $.data(element, "ui-sortable", this);
    this.element.addClass("ui-sortable");

    //Prepare the passed options
    this.options = $.extend({}, options);
    var o = this.options;
    $.extend(o, {
      items: this.options.items || '> *',
      zIndex: this.options.zIndex || 1000,
      startCondition: function() {
        return !self.disabled;  
      }   
    });
    
    $(element).bind("setData.sortable", function(event, key, value){
      self.options[key] = value;
    }).bind("getData.sortable", function(event, key){
      return self.options[key];
    });
    
    //Get the items
    this.refresh();

    //Let's determine if the items are floating
    this.floating = /left|right/.test(this.items[0].item.css('float'));
    
    //Let's determine the parent's offset
    if(!(/(relative|absolute|fixed)/).test(this.element.css('position'))) this.element.css('position', 'relative');
    this.offset = this.element.offset({ border: false });

    //Initialize mouse events for interaction
    this.element.mouseInteraction({
      executor: this,
      delay: o.delay,
      distance: o.distance || 0,
      dragPrevention: o.prevention ? o.prevention.toLowerCase().split(',') : ['input','textarea','button','select','option'],
      start: this.start,
      stop: this.stop,
      drag: this.drag,
      condition: function(e) {

        if(this.disabled) return false;

        //Find out if the clicked node (or one of its parents) is a actual item in this.items
        var currentItem = null, nodes = $(e.target).parents().andSelf().each(function() {
          if($.data(this, 'ui-sortable-item')) currentItem = $(this);
        });
        if(currentItem && (!this.options.handle || $(e.target).parents().andSelf().is(this.options.handle))) {
          this.currentItem = currentItem;
          return true;
        } else return false; 

      }
    });

  };
  
  $.extend($.ui.sortable.prototype, {
    plugins: {},
    ui: function(inst) {
      return {
        helper: (inst || this)["helper"],
        placeholder: (inst || this)["placeholder"] || $([]),
        position: (inst || this)["position"],
        absolutePosition: (inst || this)["positionAbs"],
        instance: this,
        options: this.options,
        element: this.element,
        item: (inst || this)["currentItem"],
        sender: inst ? inst.element : null
      };    
    },
    propagate: function(n,e,inst) {
      $.ui.plugin.call(this, n, [e, this.ui(inst)]);
      this.element.triggerHandler(n == "sort" ? n : "sort"+n, [e, this.ui(inst)], this.options[n]);
    },
    serialize: function(o) {
      
      var items = $(this.options.items, this.element).not('.ui-sortable-helper'); //Only the items of the sortable itself
      var str = [];
      o = o || {};
      
      items.each(function() {
        var res = (this.getAttribute(o.attribute || 'id') || '').match(o.expression || (/(.+)[-=_](.+)/));
        if(res) str.push((o.key || res[1])+'[]='+(o.key ? res[1] : res[2]));        
      });
      
      return str.join('&');
      
    },
    toArray: function(attr) {
      
      var items = $(this.options.items, this.element).not('.ui-sortable-helper'); //Only the items of the sortable itself
      var ret = [];
      
      items.each(function() {
        ret.push(this.getAttribute(attr || 'id'));        
      });
      
      return ret;
      
    },
    intersectsWith: function(item) {
      
      var x1 = this.positionAbs.left, x2 = x1 + this.helperProportions.width,
          y1 = this.positionAbs.top, y2 = y1 + this.helperProportions.height;
      var l = item.left, r = l + item.width, 
          t = item.top,  b = t + item.height;
      
      return (   l < x1 + (this.helperProportions.width  / 2)        // Right Half
        &&     x2 - (this.helperProportions.width  / 2) < r    // Left Half
        && t < y1 + (this.helperProportions.height / 2)        // Bottom Half
        &&     y2 - (this.helperProportions.height / 2) < b ); // Top Half
      
    },
    refresh: function() {
      
      this.items = [];
      var items = this.items;
      var queries = [$(this.options.items, this.element)];
      
      if(this.options.connectWith) {
        for (var i = this.options.connectWith.length - 1; i >= 0; i--){
          var inst = $.data($(this.options.connectWith[i])[0], 'ui-sortable');
          if(inst && !inst.disabled) queries.push($(inst.options.items, inst.element));
        };
      }
      
      for (var i = queries.length - 1; i >= 0; i--){
        queries[i].each(function() {
          $.data(this, 'ui-sortable-item', true); // Data for target checking (mouse manager)
          items.push({
            item: $(this),
            width: 0, height: 0,
            left: 0, top: 0
          });
        });
      };

    },
    refreshPositions: function(fast) {
      for (var i = this.items.length - 1; i >= 0; i--){
        if(!fast) this.items[i].width = this.items[i].item.outerWidth();
        if(!fast) this.items[i].height = this.items[i].item.outerHeight();
        var p = this.items[i].item.offset();
        this.items[i].left = p.left;
        this.items[i].top = p.top;
      };
    },
    destroy: function() {
      this.element
        .removeClass("ui-sortable ui-sortable-disabled")
        .removeData("ui-sortable")
        .unbind(".sortable")
        .removeMouseInteraction();
      
      for ( var i = this.items.length - 1; i >= 0; i-- )
        this.items[i].item.removeData("ui-sortable-item");
    },
    enable: function() {
      this.element.removeClass("ui-sortable-disabled");
      this.disabled = false;
    },
    disable: function() {
      this.element.addClass("ui-sortable-disabled");
      this.disabled = true;
    },
    createPlaceholder: function() {
      this.placeholderElement = this.options.placeholderElement ? $(this.options.placeholderElement, this.currentItem) : this.currentItem;
      this.placeholder = $('<div></div>')
        .addClass(this.options.placeholder)
        .appendTo('body')
        .css({ position: 'absolute' })
        .css(this.placeholderElement.offset())
        .css({ width: this.placeholderElement.outerWidth(), height: this.placeholderElement.outerHeight() })
        ;
    },
    recallOffset: function(e) {

      var elementPosition = { left: this.elementOffset.left - this.offsetParentOffset.left, top: this.elementOffset.top - this.offsetParentOffset.top };
      var r = this.helper.css('position') == 'relative';

      //Generate the original position
      this.originalPosition = {
        left: (r ? parseInt(this.helper.css('left'),10) || 0 : elementPosition.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft)),
        top: (r ? parseInt(this.helper.css('top'),10) || 0 : elementPosition.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop))
      };
      
      //Generate a flexible offset that will later be subtracted from e.pageX/Y
      this.offset = {
        left: this._pageX - this.originalPosition.left + (parseInt(this.currentItem.css('marginLeft'),10) || 0),
        top: this._pageY - this.originalPosition.top + (parseInt(this.currentItem.css('marginTop'),10) || 0)
      };
      
    },
    start: function(e) {
      
      var o = this.options;

      //Refresh the droppable items
      this.refresh(); this.refreshPositions();

      //Create and append the visible helper
      this.helper = typeof o.helper == 'function' ? $(o.helper.apply(this.element[0], [e, this.currentItem])) : this.currentItem.clone();
      this.helper.appendTo(this.currentItem[0].parentNode).css({ position: 'absolute', clear: 'both' }).addClass('ui-sortable-helper');

      //Find out the next positioned parent
      this.offsetParent = (function(cp) {
        while(cp) {
          if(cp.style && (/(absolute|relative|fixed)/).test($.css(cp,'position'))) return $(cp);
          cp = cp.parentNode ? cp.parentNode : null;
        }; return $("body");    
      })(this.helper[0].parentNode);
      
      //Prepare variables for position generation
      this.elementOffset = this.currentItem.offset();
      this.offsetParentOffset = this.offsetParent.offset();
      var elementPosition = { left: this.elementOffset.left - this.offsetParentOffset.left, top: this.elementOffset.top - this.offsetParentOffset.top };
      this._pageX = e.pageX; this._pageY = e.pageY;
      this.clickOffset = { left: e.pageX - this.elementOffset.left, top: e.pageY - this.elementOffset.top };
      var r = this.helper.css('position') == 'relative';
      
      //Generate the original position
      this.originalPosition = {
        left: (r ? parseInt(this.helper.css('left'),10) || 0 : elementPosition.left + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollLeft)),
        top: (r ? parseInt(this.helper.css('top'),10) || 0 : elementPosition.top + (this.offsetParent[0] == document.body ? 0 : this.offsetParent[0].scrollTop))
      };
      
      //Generate a flexible offset that will later be subtracted from e.pageX/Y
      //I hate margins - they need to be removed before positioning the element absolutely..
      this.offset = {
        left: e.pageX - this.originalPosition.left + (parseInt(this.currentItem.css('marginLeft'),10) || 0),
        top: e.pageY - this.originalPosition.top + (parseInt(this.currentItem.css('marginTop'),10) || 0)
      };

      //Save the first time position
      this.position = { top: e.pageY - this.offset.top, left: e.pageX - this.offset.left };
      this.positionAbs = { left: e.pageX - this.clickOffset.left, top: e.pageY - this.clickOffset.top };
      this.positionDOM = this.currentItem.prev()[0];

      //If o.placeholder is used, create a new element at the given position with the class
      if(o.placeholder) this.createPlaceholder();

      //Call plugins and callbacks
      this.propagate("start", e);

      //Save and store the helper proportions
      this.helperProportions = { width: this.helper.outerWidth(), height: this.helper.outerHeight() };
      
      //Set the original element visibility to hidden to still fill out the white space 
      $(this.currentItem).css('visibility', 'hidden');

      return false;
            
    },
    stop: function(e) {

      this.propagate("stop", e); //Call plugins and trigger callbacks
      if(this.positionDOM != this.currentItem.prev()[0]) this.propagate("update", e);
      if(!this.element[0].contains(this.currentItem[0])) { //Node was moved out of the current element
        this.propagate("remove", e);
        for (var i = this.options.connectWith.length - 1; i >= 0; i--){
          var inst = $.data($(this.options.connectWith[i])[0], 'ui-sortable');
          if(inst.element[0].contains(this.currentItem[0])) {
            inst.propagate("update", e, this);
            inst.propagate("receive", e, this);
          }
        };        
      };
      
      if(this.cancelHelperRemoval) return false;      
      $(this.currentItem).css('visibility', '');
      if(this.placeholder) this.placeholder.remove();
      this.helper.remove();

      return false;
      
    },
    drag: function(e) {

      //Compute the helpers position
      this.direction = (this.floating && this.positionAbs.left > e.pageX - this.clickOffset.left) || (this.positionAbs.top > e.pageY - this.clickOffset.top) ? 'down' : 'up';
      this.position = { top: e.pageY - this.offset.top, left: e.pageX - this.offset.left };
      this.positionAbs = { left: e.pageX - this.clickOffset.left, top: e.pageY - this.clickOffset.top };

      //Rearrange
      for (var i = this.items.length - 1; i >= 0; i--) {
        if(this.intersectsWith(this.items[i]) && this.items[i].item[0] != this.currentItem[0] && (this.options.tree ? !this.currentItem[0].contains(this.items[i].item[0]) : true)) {
          //Rearrange the DOM
          this.items[i].item[this.direction == 'down' ? 'before' : 'after'](this.currentItem);
          this.refreshPositions(true); //Precompute after each DOM insertion, NOT on mousemove
          if(this.placeholderElement) this.placeholder.css(this.placeholderElement.offset());
          this.propagate("change", e); //Call plugins and callbacks
          break;
        }
      }

      this.propagate("sort", e); //Call plugins and callbacks
      this.helper.css({ left: this.position.left+'px', top: this.position.top+'px' }); // Stick the helper to the cursor
      return false;
      
    }
  });

})(jQuery);

/*
 * 'this' -> original element
 * 1. argument: browser event
 * 2.argument: ui object
 */

(function($) {

  $.ui.plugin.add("sortable", "cursor", {
    start: function(e,ui) {
      var t = $('body');
      if (t.css("cursor")) ui.options._cursor = t.css("cursor");
      t.css("cursor", ui.options.cursor);
    },
    stop: function(e,ui) {
      if (ui.options._cursor) $('body').css("cursor", ui.options._cursor);
    }
  });

  $.ui.plugin.add("sortable", "zIndex", {
    start: function(e,ui) {
      var t = ui.helper;
      if(t.css("zIndex")) ui.options._zIndex = t.css("zIndex");
      t.css('zIndex', ui.options.zIndex);
    },
    stop: function(e,ui) {
      if(ui.options._zIndex) $(ui.helper).css('zIndex', ui.options._zIndex);
    }
  });

  $.ui.plugin.add("sortable", "opacity", {
    start: function(e,ui) {
      var t = ui.helper;
      if(t.css("opacity")) ui.options._opacity = t.css("opacity");
      t.css('opacity', ui.options.opacity);
    },
    stop: function(e,ui) {
      if(ui.options._opacity) $(ui.helper).css('opacity', ui.options._opacity);
    }
  });


  $.ui.plugin.add("sortable", "revert", {
    stop: function(e,ui) {
      var self = ui.instance;
      self.cancelHelperRemoval = true;
      var cur = self.currentItem.offset();
      if(ui.instance.options.zIndex) ui.helper.css('zIndex', ui.instance.options.zIndex); //Do the zIndex again because it already was resetted by the plugin above on stop

      //Also animate the placeholder if we have one
      if(ui.instance.placeholder) ui.instance.placeholder.animate({ opacity: 'hide' }, parseInt(ui.options.revert, 10) || 500);
      
      ui.helper.animate({
        left: cur.left - self.offsetParentOffset.left - (parseInt(self.currentItem.css('marginLeft'),10) || 0),
        top: cur.top - self.offsetParentOffset.top - (parseInt(self.currentItem.css('marginTop'),10) || 0)
      }, parseInt(ui.options.revert, 10) || 500, function() {
        self.currentItem.css('visibility', 'visible');
        window.setTimeout(function() {
          if(self.placeholder) self.placeholder.remove();
          self.helper.remove();
          if(ui.options._zIndex) ui.helper.css('zIndex', ui.options._zIndex);
        }, 50);
      });
    }
  });

  
  $.ui.plugin.add("sortable", "containment", {
    start: function(e,ui) {

      var o = ui.options;
      if((o.containment.left != undefined || o.containment.constructor == Array) && !o._containment) return;
      if(!o._containment) o._containment = o.containment;

      if(o._containment == 'parent') o._containment = this[0].parentNode;
      if(o._containment == 'document') {
        o.containment = [
          0,
          0,
          $(document).width(),
          ($(document).height() || document.body.parentNode.scrollHeight)
        ];
      } else { //I'm a node, so compute top/left/right/bottom

        var ce = $(o._containment)[0];
        var co = $(o._containment).offset();

        o.containment = [
          co.left,
          co.top,
          co.left+(ce.offsetWidth || ce.scrollWidth),
          co.top+(ce.offsetHeight || ce.scrollHeight)
        ];
      }

    },
    sort: function(e,ui) {

      var o = ui.options;
      var h = ui.helper;
      var c = o.containment;
      var self = ui.instance;
      
      if(c.constructor == Array) {
        if((ui.absolutePosition.left < c[0])) self.position.left = c[0] - (self.offset.left - self.clickOffset.left);
        if((ui.absolutePosition.top < c[1])) self.position.top = c[1] - (self.offset.top - self.clickOffset.top);
        if(ui.absolutePosition.left - c[2] + self.helperProportions.width >= 0) self.position.left = c[2] - (self.offset.left - self.clickOffset.left) - self.helperProportions.width;
        if(ui.absolutePosition.top - c[3] + self.helperProportions.height >= 0) self.position.top = c[3] - (self.offset.top - self.clickOffset.top) - self.helperProportions.height;
      } else {
        if((ui.position.left < c.left)) self.position.left = c.left;
        if((ui.position.top < c.top)) self.position.top = c.top;
        if(ui.position.left - self.offsetParent.innerWidth() + self.helperProportions.width + c.right + (parseInt(self.offsetParent.css("borderLeftWidth"), 10) || 0) + (parseInt(self.offsetParent.css("borderRightWidth"), 10) || 0) >= 0) self.position.left = self.offsetParent.innerWidth() - self.helperProportions.width - c.right - (parseInt(self.offsetParent.css("borderLeftWidth"), 10) || 0) - (parseInt(self.offsetParent.css("borderRightWidth"), 10) || 0);
        if(ui.position.top - self.offsetParent.innerHeight() + self.helperProportions.height + c.bottom + (parseInt(self.offsetParent.css("borderTopWidth"), 10) || 0) + (parseInt(self.offsetParent.css("borderBottomWidth"), 10) || 0) >= 0) self.position.top = self.offsetParent.innerHeight() - self.helperProportions.height - c.bottom - (parseInt(self.offsetParent.css("borderTopWidth"), 10) || 0) - (parseInt(self.offsetParent.css("borderBottomWidth"), 10) || 0);
      }

    }
  });

  $.ui.plugin.add("sortable", "axis", {
    sort: function(e,ui) {
      var o = ui.options;
      if(o.constraint) o.axis = o.constraint; //Legacy check
      o.axis == 'x' ? ui.instance.position.top = ui.instance.originalPosition.top : ui.instance.position.left = ui.instance.originalPosition.left;
    }
  });

  $.ui.plugin.add("sortable", "scroll", {
    start: function(e,ui) {
      var o = ui.options;
      o.scrollSensitivity = o.scrollSensitivity || 20;
      o.scrollSpeed   = o.scrollSpeed || 20;

      ui.instance.overflowY = function(el) {
        do { if((/auto|scroll/).test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-y'))) return el; el = el.parent(); } while (el[0].parentNode);
        return $(document);
      }(this);
      ui.instance.overflowX = function(el) {
        do { if((/auto|scroll/).test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-x'))) return el; el = el.parent(); } while (el[0].parentNode);
        return $(document);
      }(this);
    },
    sort: function(e,ui) {
      
      var o = ui.options;
      var i = ui.instance;

      if(i.overflowY[0] != document && i.overflowY[0].tagName != 'HTML') {
        if(i.overflowY[0].offsetHeight - (ui.position.top - i.overflowY[0].scrollTop + i.clickOffset.top) < o.scrollSensitivity)
          i.overflowY[0].scrollTop = i.overflowY[0].scrollTop + o.scrollSpeed;
        if((ui.position.top - i.overflowY[0].scrollTop + i.clickOffset.top) < o.scrollSensitivity)
          i.overflowY[0].scrollTop = i.overflowY[0].scrollTop - o.scrollSpeed;        
      } else {
        //$(document.body).append('<p>'+(e.pageY - $(document).scrollTop())+'</p>');
        if(e.pageY - $(document).scrollTop() < o.scrollSensitivity)
          $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
        if($(window).height() - (e.pageY - $(document).scrollTop()) < o.scrollSensitivity)
          $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
      }
      
      if(i.overflowX[0] != document && i.overflowX[0].tagName != 'HTML') {
        if(i.overflowX[0].offsetWidth - (ui.position.left - i.overflowX[0].scrollLeft + i.clickOffset.left) < o.scrollSensitivity)
          i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft + o.scrollSpeed;
        if((ui.position.top - i.overflowX[0].scrollLeft + i.clickOffset.left) < o.scrollSensitivity)
          i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft - o.scrollSpeed;        
      } else {
        if(e.pageX - $(document).scrollLeft() < o.scrollSensitivity)
          $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
        if($(window).width() - (e.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
          $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
      }
      
      ui.instance.recallOffset(e);

    }
  });

})(jQuery);

(function($) {

  $.fn.extend({
    slider: function(options) {
      var args = Array.prototype.slice.call(arguments, 1);
      
      if ( options == "value" )
        return $.data(this[0], "ui-slider").value(arguments[1]);
      
      return this.each(function() {
        if (typeof options == "string") {
          var slider = $.data(this, "ui-slider");
          slider[options].apply(slider, args);

        } else if(!$.data(this, "ui-slider"))
          new $.ui.slider(this, options);
      });
    }
  });
  
  $.ui.slider = function(element, options) {

    //Initialize needed constants
    var self = this;
    this.element = $(element);
    $.data(element, "ui-slider", this);
    this.element.addClass("ui-slider");
    
    //Prepare the passed options
    this.options = $.extend({}, options);
    var o = this.options;
    $.extend(o, {
      axis: o.axis || (element.offsetWidth < element.offsetHeight ? 'vertical' : 'horizontal'),
      maxValue: !isNaN(parseInt(o.maxValue,10)) ? parseInt(o.maxValue,10) :  100,
      minValue: parseInt(o.minValue,10) || 0,
      startValue: parseInt(o.startValue,10) || 'none'   
    });
    
    //Prepare the real maxValue
    o.realMaxValue = o.maxValue - o.minValue;
    
    //Calculate stepping based on steps
    o.stepping = parseInt(o.stepping,10) || (o.steps ? o.realMaxValue/o.steps : 0);
    
    $(element).bind("setData.slider", function(event, key, value){
      self.options[key] = value;
    }).bind("getData.slider", function(event, key){
      return self.options[key];
    });

    //Initialize mouse and key events for interaction
    this.handle = o.handle ? $(o.handle, element) : $('> *', element);
    $(this.handle)
      .mouseInteraction({
        executor: this,
        delay: o.delay,
        distance: o.distance || 0,
        dragPrevention: o.prevention ? o.prevention.toLowerCase().split(',') : ['input','textarea','button','select','option'],
        start: this.start,
        stop: this.stop,
        drag: this.drag,
        condition: function(e, handle) {
          if(!this.disabled) {
            if(this.currentHandle) this.blur(this.currentHandle);
            this.focus(handle,1);
            return !this.disabled;
          }
        }
      })
      .wrap('<a href="javascript:void(0)"></a>')
      .parent()
        .bind('focus', function(e) { self.focus(this.firstChild); })
        .bind('blur', function(e) { self.blur(this.firstChild); })
        .bind('keydown', function(e) {
          if(/(37|39)/.test(e.keyCode))
            self.moveTo((e.keyCode == 37 ? '-' : '+')+'='+(self.options.stepping ? self.options.stepping : (self.options.realMaxValue / self.size)*5),this.firstChild);
        })
    ;
    
    //Position the node
    if(o.helper == 'original' && (this.element.css('position') == 'static' || this.element.css('position') == '')) this.element.css('position', 'relative');
    
    //Prepare dynamic properties for later use
    if(o.axis == 'horizontal') {
      this.size = this.element.outerWidth();
      this.properties = ['left', 'width'];
    } else {
      this.size = this.element.outerHeight();
      this.properties = ['top', 'height'];
    }
    
    //Bind the click to the slider itself
    this.element.bind('click', function(e) { self.click.apply(self, [e]); });
    
    //Move the first handle to the startValue
    if(!isNaN(o.startValue)) this.moveTo(o.startValue, 0);
    
    //If we only have one handle, set the previous handle to this one to allow clicking before selecting the handle
    if(this.handle.length == 1) this.previousHandle = this.handle;
    
    
    if(this.handle.length == 2 && o.range) this.createRange();
  
  };
  
  $.extend($.ui.slider.prototype, {
    plugins: {},
    createRange: function() {
      this.rangeElement = $('<div></div>')
        .addClass('ui-slider-range')
        .css({ position: 'absolute' })
        .css(this.properties[0], parseInt($(this.handle[0]).css(this.properties[0]),10) + this.handleSize(0)/2)
        .css(this.properties[1], parseInt($(this.handle[1]).css(this.properties[0]),10) - parseInt($(this.handle[0]).css(this.properties[0]),10))
        .appendTo(this.element);
    },
    updateRange: function() {
        this.rangeElement.css(this.properties[0], parseInt($(this.handle[0]).css(this.properties[0]),10) + this.handleSize(0)/2);
        this.rangeElement.css(this.properties[1], parseInt($(this.handle[1]).css(this.properties[0]),10) - parseInt($(this.handle[0]).css(this.properties[0]),10));
    },
    getRange: function() {
      return this.rangeElement ? this.convertValue(parseInt(this.rangeElement.css(this.properties[1]),10)) : null;
    },
    ui: function(e) {
      return {
        instance: this,
        options: this.options,
        handle: this.currentHandle,
        value: this.value(),
        range: this.getRange()
      };
    },
    propagate: function(n,e) {
      $.ui.plugin.call(this, n, [e, this.ui()]);
      this.element.triggerHandler(n == "slide" ? n : "slide"+n, [e, this.ui()], this.options[n]);
    },
    destroy: function() {
      this.element
        .removeClass("ui-slider ui-slider-disabled")
        .removeData("ul-slider")
        .unbind(".slider");
      this.handles.removeMouseInteraction();
    },
    enable: function() {
      this.element.removeClass("ui-slider-disabled");
      this.disabled = false;
    },
    disable: function() {
      this.element.addClass("ui-slider-disabled");
      this.disabled = true;
    },
    focus: function(handle,hard) {
      this.currentHandle = $(handle).addClass('ui-slider-handle-active');
      if(hard) this.currentHandle.parent()[0].focus();
    },
    blur: function(handle) {
      $(handle).removeClass('ui-slider-handle-active');
      if(this.currentHandle && this.currentHandle[0] == handle) { this.previousHandle = this.currentHandle; this.currentHandle = null; };
    },
    value: function(handle) {
      if(this.handle.length == 1) this.currentHandle = this.handle;
      return ((parseInt($(handle != undefined ? this.handle[handle] || handle : this.currentHandle).css(this.properties[0]),10) / (this.size - this.handleSize())) * this.options.realMaxValue) + this.options.minValue;
    },
    convertValue: function(value) {
      return (value / (this.size - this.handleSize())) * this.options.realMaxValue;
    },
    translateValue: function(value) {
      return ((value - this.options.minValue) / this.options.realMaxValue) * (this.size - this.handleSize());
    },
    handleSize: function(handle) {
      return $(handle != undefined ? this.handle[handle] : this.currentHandle)['outer'+this.properties[1].substr(0,1).toUpperCase()+this.properties[1].substr(1)]();  
    },
    click: function(e) {
    
      // This method is only used if:
      // - The user didn't click a handle
      // - The Slider is not disabled
      // - There is a current, or previous selected handle (otherwise we wouldn't know which one to move)
      var pointer = [e.pageX,e.pageY];
      var clickedHandle = false; this.handle.each(function() { if(this == e.target) clickedHandle = true;  });
      if(clickedHandle || this.disabled || !(this.currentHandle || this.previousHandle)) return;

      //If a previous handle was focussed, focus it again
      if(this.previousHandle) this.focus(this.previousHandle, 1);
      
      //Move focussed handle to the clicked position
      this.offset = this.element.offset();
      this.moveTo(this.convertValue(e[this.properties[0] == 'top' ? 'pageY' : 'pageX'] - this.offset[this.properties[0]] - this.handleSize()/2));
      
    },
    start: function(e, handle) {
      
      var o = this.options;
      
      this.offset = this.element.offset();
      this.handleOffset = this.currentHandle.offset();
      this.clickOffset = { top: e.pageY - this.handleOffset.top, left: e.pageX - this.handleOffset.left };
      this.firstValue = this.value();
      
      this.propagate('start', e);
      return false;
            
    },
    stop: function(e) {
      this.propagate('stop', e);
      if(this.firstValue != this.value()) this.propagate('change', e);
      return false;
    },
    drag: function(e, handle) {

      var o = this.options;
      var position = { top: e.pageY - this.offset.top - this.clickOffset.top, left: e.pageX - this.offset.left - this.clickOffset.left};

      var modifier = position[this.properties[0]];      
      if(modifier >= this.size - this.handleSize()) modifier = this.size - this.handleSize();
      if(modifier <= 0) modifier = 0;
      
      if(o.stepping) {
        var value = this.convertValue(modifier);
        value = Math.round(value / o.stepping) * o.stepping;
        modifier = this.translateValue(value);  
      }

      if(this.rangeElement) {
        if(this.currentHandle[0] == this.handle[0] && modifier >= this.translateValue(this.value(1))) modifier = this.translateValue(this.value(1));
        if(this.currentHandle[0] == this.handle[1] && modifier <= this.translateValue(this.value(0))) modifier = this.translateValue(this.value(0));
      } 
      
      this.currentHandle.css(this.properties[0], modifier);
      if(this.rangeElement) this.updateRange();
      this.propagate('slide', e);
      return false;
      
    },
    moveTo: function(value, handle) {

      var o = this.options;
      if(handle == undefined && !this.currentHandle && this.handle.length != 1) return false; //If no handle has been passed, no current handle is available and we have multiple handles, return false
      if(handle == undefined && !this.currentHandle) handle = 0; //If only one handle is available, use it
      if(handle != undefined) this.currentHandle = this.previousHandle = $(this.handle[handle] || handle);

      if(value.constructor == String) value = /\-\=/.test(value) ? this.value() - parseInt(value.replace('-=', ''),10) : this.value() + parseInt(value.replace('+=', ''),10);
      if(o.stepping) value = Math.round(value / o.stepping) * o.stepping;
      value = this.translateValue(value);

      if(value >= this.size - this.handleSize()) value = this.size - this.handleSize();
      if(value <= 0) value = 0;
      if(this.rangeElement) {
        if(this.currentHandle[0] == this.handle[0] && value >= this.translateValue(this.value(1))) value = this.translateValue(this.value(1));
        if(this.currentHandle[0] == this.handle[1] && value <= this.translateValue(this.value(0))) value = this.translateValue(this.value(0));
      }
      
      this.currentHandle.css(this.properties[0], value);
      if(this.rangeElement) this.updateRange();
      
      this.propagate('start', null);
      this.propagate('stop', null);
      this.propagate('change', null);

    }
  });

})(jQuery);