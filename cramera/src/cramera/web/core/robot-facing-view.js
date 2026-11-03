/* ============================================================================
 * core/robot-facing-view.js — where a camera stands to face the robot from the front,
 * as a person across a table would.
 *
 * Poses are the bridge's [x, y, z, qx, qy, qz, qw] in the z-up world frame, and the
 * robot's forward axis is the x axis of its root. Only the heading about the vertical
 * counts, so a tilted root does not tilt the view. Where a wall or furniture stands
 * between the robot and that place, the camera comes closer instead.
 *
 * Pure geometry, no DOM and no three.js, so it is testable under node.
 * ==========================================================================*/
(function (global) {
  'use strict';

  /* The robot's forward axis projected onto the ground, as a unit [x, y]. */
  function forwardOnGround(basePose) {
    const qx = basePose[3], qy = basePose[4], qz = basePose[5], qw = basePose[6];
    const x = 1 - 2 * (qy * qy + qz * qz);
    const y = 2 * (qx * qy + qw * qz);
    const length = Math.hypot(x, y);
    return [x / length, y / length];
  }

  /* The camera position and look-at target, in world coordinates, that face the robot
   * at ``basePose``; ``settings`` holds distance, height and target_height in metres. */
  function of(basePose, settings) {
    const forward = forwardOnGround(basePose);
    const x = basePose[0], y = basePose[1], z = basePose[2];
    return {
      position: [
        x + forward[0] * settings.distance,
        y + forward[1] * settings.distance,
        z + settings.height,
      ],
      target: [x, y, z + settings.target_height],
    };
  }

  /* ``view`` with its camera pulled towards the point it looks at until it stays the
   * obstacle clearance short of an obstacle ``freeDistance`` away from that point;
   * null when that leaves the camera closer than the minimum distance. ``settings``
   * holds obstacle_clearance and minimum_distance in metres. */
  function clearOf(view, freeDistance, settings) {
    const offset = view.position.map(function (value, index) { return value - view.target[index]; });
    const reach = Math.hypot(offset[0], offset[1], offset[2]);
    const allowed = freeDistance - settings.obstacle_clearance;
    if (allowed >= reach) return view;
    if (allowed < settings.minimum_distance) return null;
    const share = allowed / reach;
    return {
      position: view.target.map(function (value, index) { return value + share * offset[index]; }),
      target: view.target,
    };
  }

  global.RobotFacingView = {
    of: of,
    clearOf: clearOf,
  };
})(window);
