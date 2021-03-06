(!(function($) {
  $(function() {
    var backgroundImgs, mc_lastHeartbeat;
    function listener(e) {
      if (Settings.windowHasFocus === true && e.type === "animationiteration") {
        if (Math.round(e.elapsedTime)%20 > 0) {
          $('.background-image-changer.even').attr('src', [backgroundImgs.base, '/', backgroundImgs.f[Math.floor(Math.random()*backgroundImgs.f.length)]].join(''));
          //Switch the even one
        }
        else {
          $('.background-image-changer.odd').attr('src', [backgroundImgs.base, '/', backgroundImgs.f[Math.floor(Math.random()*backgroundImgs.f.length)]].join(''));
          //Switch the odd one
        }
      }
    }

    socket.on('mc_dead', function(t) {
      console.log(t);
    });

    socket.on('mc_stdOut', function(d) {
      console.log(d);
    });

    socket.on('mc_stdErr', function(d) {
      console.log(d);
    });

    socket.on('mc_heartbeat', function(t) {
      mc_lastHeartbeat = t;
    });

    socket.on('b_imgs', function (data) {
      backgroundImgs = data;
      //Set some images as soon as we have the data
      $('.background-image-changer.odd').attr('src', [backgroundImgs.base, '/', backgroundImgs.f[Math.floor(Math.random()*backgroundImgs.f.length)]].join(''));
      $('.background-image-changer.even').attr('src', [backgroundImgs.base, '/', backgroundImgs.f[Math.floor(Math.random()*backgroundImgs.f.length)]].join(''));
      var e = document.getElementsByClassName('background-image-changer');
      e[1].addEventListener("animationiteration", listener, false);
    });
  });
}(jQuery)));
