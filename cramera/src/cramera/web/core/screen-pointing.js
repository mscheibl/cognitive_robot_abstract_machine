/* ============================================================================
 * core/screen-pointing.js — what the viewer tells the bridge about the camera it shows,
 * and where it draws a mark for a person to point at, so pointing at the screen can
 * be turned into a spot in the world.
 *
 * Views are the bridge's :class:`cramera.camera.Viewpoint` fields; a report is what
 * :class:`cramera.camera.ShownCamera` reads; marks are
 * :class:`cramera.camera.ScenePosition` fields.
 *
 * Pure functions, no DOM and no three.js, so it is testable under node.
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* The report of a camera the viewer starts to show the scene through: ``view``
     ({position, target}), its vertical field of view in degrees, the scene's width
     over its height, and when it started, in epoch milliseconds. */
  function shownCameraReport(view, verticalFieldOfView, aspectRatio, shownAtEpochMs) {
    return {
      viewpoint: { position: view.position, target: view.target },
      vertical_field_of_view: verticalFieldOfView,
      aspect_ratio: aspectRatio,
      shown_at_epoch_ms: shownAtEpochMs,
    };
  }

  /* Where to draw ``mark`` over the scene, as CSS placement; hidden for none. */
  function markPlacement(mark) {
    if (!mark) return { left: '0%', top: '0%', display: 'none' };
    return {
      left: (mark.horizontal * 100) + '%',
      top: (mark.vertical * 100) + '%',
      display: 'block',
    };
  }

  global.ScreenPointing = {
    shownCameraReport: shownCameraReport,
    markPlacement: markPlacement,
  };
})(window);
