/* ============================================================================
 * core/automatic-camera.js — which view the automatic camera shows: the fixed
 * overview while the robot's base moves, the robot-facing view once it rests.
 *
 * The base rests while it stays within the standstill tolerances of the pose it came
 * to rest at, so a base creeping in small steps still counts as moving. Settings are
 * the bridge's :class:`cramera.camera.AutomaticCamera` fields; times are in seconds.
 *
 * Pure state, no DOM and no three.js, so it is testable under node.
 * ==========================================================================*/
(function (global) {
  'use strict';

  //: the view of the fixed overview
  const OVERVIEW = 'overview';
  //: the view that faces the robot from the front
  const ROBOT_FACING = 'robot-facing';

  /* The heading of a [x, y, z, qx, qy, qz, qw] pose about the vertical, in radians. */
  function heading(pose) {
    const qx = pose[3], qy = pose[4], qz = pose[5], qw = pose[6];
    return Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
  }

  /* The smaller angle between two headings, in radians. */
  function headingDifference(first, second) {
    const difference = Math.abs(first - second) % (2 * Math.PI);
    return difference > Math.PI ? 2 * Math.PI - difference : difference;
  }

  /* A camera that is told every base pose and answers which view to show. */
  function create(settings) {
    let restingPose = null;
    let restingSince = -Infinity;

    function staysAt(pose) {
      const drift = Math.hypot(
        pose[0] - restingPose[0], pose[1] - restingPose[1], pose[2] - restingPose[2]
      );
      return drift <= settings.standstill_translation_tolerance
        && headingDifference(heading(pose), heading(restingPose))
          <= settings.standstill_rotation_tolerance;
    }

    /* Take the base pose at ``seconds`` into account and return the view to show. */
    function observe(pose, seconds) {
      if (restingPose === null) {
        restingPose = pose;
      } else if (!staysAt(pose)) {
        restingPose = pose;
        restingSince = seconds;
      }
      if (seconds - restingSince >= settings.standstill_duration) return ROBOT_FACING;
      return OVERVIEW;
    }

    return { observe: observe };
  }

  global.AutomaticCamera = {
    OVERVIEW: OVERVIEW,
    ROBOT_FACING: ROBOT_FACING,
    create: create,
  };
})(window);
