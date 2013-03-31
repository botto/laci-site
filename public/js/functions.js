var Settings = {
  windowHasFocus: true,
  backgroundImages: null
};
var laciFunc = {};

(!(function($) {
  //It probably has focus when the page is initially loaded
  $(function() {
    /**
     * From Stackoverflow http://stackoverflow.com/a/1060034
     * Modified to set a global var instead of the body class
     */
    var hidden = "hidden";

    // Standards:
    if (hidden in document) {
      document.addEventListener("visibilitychange", onchange);
    }
    else if ((hidden = "mozHidden") in document) {
      document.addEventListener("mozvisibilitychange", onchange);
    }
    else if ((hidden = "webkitHidden") in document) {
      document.addEventListener("webkitvisibilitychange", onchange);
    }
    else if ((hidden = "msHidden") in document) {
      document.addEventListener("msvisibilitychange", onchange);
    }

    // IE 9 and lower:
    else if ('onfocusin' in document) {
      document.onfocusin = document.onfocusout = onchange;
    }

    // All others:
    else {
      window.onfocus = window.onblur = onchange;
    }

    function onchange (evt) {
      evt = evt || window.event;

      if (evt.type == "focus" || evt.type == "focusin")
        Settings.windowHasFocus = true;
      else if (evt.type == "blur" || evt.type == "focusout")
        Settings.windowHasFocus = false;
      else        
        Settings.windowHasFocus = this[hidden] ? false : true;
    }
  });
}(jQuery)));
