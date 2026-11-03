/* ============================================================================
 * core/scene.js — the active scene and the page layout, as read from the page URL.
 *
 * robot_scene/panel.js switches scenes by reloading the page with a new
 * ?scene= query param; every panel that talks to the /api/* routes must read
 * the same param so its requests target that same scene instead of whatever
 * the server falls back to.
 *
 * The same URL says whether the page shows the 3D scene alone: ?layout=scene
 * opens it that way in a window of its own (the pop-out for a second screen),
 * and a page another page embeds in an iframe with ?scene or ?replay= is the
 * embedded scene or replay popup. ?camera=automatic hands the camera to the live
 * bridge's automatic camera, for an audience watching the robot.
 * ==========================================================================*/
(function () {
  'use strict';

  //: value of the ?layout= param that shows the 3D scene alone
  const LAYOUT_SCENE = 'scene';
  //: class on the root element while the 3D scene is shown alone; app.css styles it
  const SCENE_ONLY_CLASS = 'scene-only';
  //: class on the root element while the automatic camera shows the scene to an audience
  const AUTOMATIC_CAMERA_CLASS = 'automatic-camera';
  //: class on the root element of the window the scene was popped out into
  const POPPED_OUT_CLASS = 'popped-out';
  const LAYOUT_SCENE_PATTERN = new RegExp('[?&]layout=' + LAYOUT_SCENE + '(&|$)');
  //: value of the ?camera= param that lets the viewer point its camera on its own
  const CAMERA_AUTOMATIC = 'automatic';
  const CAMERA_AUTOMATIC_PATTERN = new RegExp('[?&]camera=' + CAMERA_AUTOMATIC + '(&|$)');
  //: the viewer page a pop-out window opens
  const VIEWER_PAGE = 'index.html';

  function name() {
    const m = /[?&]scene=([\w-]+)/.exec(window.location.search);
    return m ? m[1] : null;
  }

  function withScene(url) {
    const active = name();
    if (!active) return url;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'scene=' + encodeURIComponent(active);
  }

  //: whether this window is the one the scene was popped out into
  function poppedOut() {
    return LAYOUT_SCENE_PATTERN.test(window.location.search);
  }

  //: whether the page shows the 3D scene alone; ``framed`` says the page sits in an iframe
  function sceneOnly(framed) {
    if (poppedOut()) return true;
    return framed && /[?&](replay=|scene(\b|=))/.test(window.location.search);
  }

  //: whether the viewer points its camera on its own, as the live bridge's automatic
  //: camera says
  function automaticCamera() {
    return CAMERA_AUTOMATIC_PATTERN.test(window.location.search);
  }

  //: the url that opens the active scene alone in a window of its own
  function popOutUrl() {
    return withScene(VIEWER_PAGE) + (name() ? '&' : '?') + 'layout=' + LAYOUT_SCENE;
  }

  window.SceneContext = {
    LAYOUT_SCENE: LAYOUT_SCENE,
    CAMERA_AUTOMATIC: CAMERA_AUTOMATIC,
    AUTOMATIC_CAMERA_CLASS: AUTOMATIC_CAMERA_CLASS,
    SCENE_ONLY_CLASS: SCENE_ONLY_CLASS,
    POPPED_OUT_CLASS: POPPED_OUT_CLASS,
    name: name,
    withScene: withScene,
    sceneOnly: sceneOnly,
    poppedOut: poppedOut,
    automaticCamera: automaticCamera,
    popOutUrl: popOutUrl,
  };
})();
