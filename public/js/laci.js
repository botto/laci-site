(!(function($) {
  $(function() {
    function listener(e) {
      if (Settings.windowHasFocus === true && e.type === "animationiteration") {
        if (Math.round(e.elapsedTime)%20 > 0) {
          laciFunc.randomBackgroundImage('.background-image-changer.even');
          //Switch the even one
        }
        else {
          laciFunc.randomBackgroundImage('.background-image-changer.odd');
          //Switch the odd one
        }
      }
    }

    var e = document.getElementsByClassName('background-image-changer');
    e[1].addEventListener("animationiteration", listener, false);
  });
}(jQuery)));
