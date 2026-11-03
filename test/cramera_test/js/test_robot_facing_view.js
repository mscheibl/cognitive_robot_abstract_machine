const BrowserSource = require('./browser_source');
// Unit tests for web/core/robot-facing-view.js (node:test): where the camera stands to
// face the robot from the front.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const WEB = path.join(__dirname, '..', '..', '..', 'cramera', 'src', 'cramera', 'web');

function loadRobotFacingView() {
  const scope = {};
  new Function('window', BrowserSource.read(path.join(WEB, 'core/robot-facing-view.js')))(scope);
  return scope.RobotFacingView;
}

// %% fixtures

const SETTINGS = {
  distance: 2.5, height: 1.6, target_height: 1.0, obstacle_clearance: 0.2, minimum_distance: 1.0,
};

//: [x, y, z, qx, qy, qz, qw] of a robot at (x, y) turned by ``yaw`` about the vertical
function basePose(x, y, yaw) {
  return [x, y, 0, 0, 0, Math.sin(yaw / 2), Math.cos(yaw / 2)];
}

function assertClose(actual, expected) {
  actual.forEach(function (value, index) {
    assert.ok(Math.abs(value - expected[index]) < 1e-9, actual + ' != ' + expected);
  });
}

// %% robot-facing view

test('a robot facing along x is looked at from in front of it along x', function () {
  const view = loadRobotFacingView().of(basePose(1, 2, 0), SETTINGS);
  assertClose(view.position, [1 + SETTINGS.distance, 2, SETTINGS.height]);
  assertClose(view.target, [1, 2, SETTINGS.target_height]);
});

test('the camera turns with the robot', function () {
  const view = loadRobotFacingView().of(basePose(1, 2, Math.PI / 2), SETTINGS);
  assertClose(view.position, [1, 2 + SETTINGS.distance, SETTINGS.height]);
});

test('heights count from the robot root', function () {
  const raised = basePose(0, 0, 0);
  raised[2] = 0.3;
  const view = loadRobotFacingView().of(raised, SETTINGS);
  assertClose(view.position, [SETTINGS.distance, 0, 0.3 + SETTINGS.height]);
  assertClose(view.target, [0, 0, 0.3 + SETTINGS.target_height]);
});

// %% obstacles between the robot and the camera

//: how far the camera of ``view`` stands from the point it looks at
function reach(view) {
  return Math.hypot(
    view.position[0] - view.target[0],
    view.position[1] - view.target[1],
    view.position[2] - view.target[2]
  );
}

test('a view with nothing in the way is kept', function () {
  const RobotFacingView = loadRobotFacingView();
  const view = RobotFacingView.of(basePose(1, 2, 0), SETTINGS);
  assert.deepStrictEqual(RobotFacingView.clearOf(view, Infinity, SETTINGS), view);
});

test('an obstacle behind the camera does not move it', function () {
  const RobotFacingView = loadRobotFacingView();
  const view = RobotFacingView.of(basePose(1, 2, 0), SETTINGS);
  assert.deepStrictEqual(RobotFacingView.clearOf(view, reach(view) + 1, SETTINGS), view);
});

test('an obstacle in the way pulls the camera towards the robot, short of the obstacle', function () {
  const RobotFacingView = loadRobotFacingView();
  const view = RobotFacingView.of(basePose(1, 2, 0), SETTINGS);
  const obstacle = 1.7;
  const cleared = RobotFacingView.clearOf(view, obstacle, SETTINGS);
  const share = (obstacle - SETTINGS.obstacle_clearance) / reach(view);
  assertClose(cleared.position, view.target.map(function (value, index) {
    return value + share * (view.position[index] - value);
  }));
  assertClose(cleared.target, view.target);
});

test('a view that an obstacle pushes closer than the minimum distance is given up', function () {
  const RobotFacingView = loadRobotFacingView();
  const view = RobotFacingView.of(basePose(1, 2, 0), SETTINGS);
  const obstacle = SETTINGS.minimum_distance + SETTINGS.obstacle_clearance - 0.01;
  assert.strictEqual(RobotFacingView.clearOf(view, obstacle, SETTINGS), null);
});
