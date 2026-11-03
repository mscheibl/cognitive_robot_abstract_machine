const BrowserSource = require('./browser_source');
// Unit tests for web/core/automatic-camera.js (node:test): which view the automatic
// camera shows while the robot's base moves and rests.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const WEB = path.join(__dirname, '..', '..', '..', 'cramera', 'src', 'cramera', 'web');

function loadAutomaticCamera() {
  const scope = {};
  new Function('window', BrowserSource.read(path.join(WEB, 'core/automatic-camera.js')))(scope);
  return scope.AutomaticCamera;
}

// %% fixtures

const SETTINGS = {
  standstill_duration: 1.0,
  standstill_translation_tolerance: 0.01,
  standstill_rotation_tolerance: 0.0175,
};

//: [x, y, z, qx, qy, qz, qw] of a base at (x, y) turned by ``yaw`` about the vertical
function basePose(x, y, yaw) {
  return [x, y, 0, 0, 0, Math.sin(yaw / 2), Math.cos(yaw / 2)];
}

// %% view selection

test('a robot standing from the start is faced at once', function () {
  const AutomaticCamera = loadAutomaticCamera();
  const camera = AutomaticCamera.create(SETTINGS);
  assert.strictEqual(camera.observe(basePose(0, 0, 0), 0), AutomaticCamera.ROBOT_FACING);
});

test('a driving base is shown from the overview', function () {
  const AutomaticCamera = loadAutomaticCamera();
  const camera = AutomaticCamera.create(SETTINGS);
  camera.observe(basePose(0, 0, 0), 0);
  const step = 2 * SETTINGS.standstill_translation_tolerance;
  assert.strictEqual(camera.observe(basePose(step, 0, 0), 0.1), AutomaticCamera.OVERVIEW);
});

test('a turning base is shown from the overview', function () {
  const AutomaticCamera = loadAutomaticCamera();
  const camera = AutomaticCamera.create(SETTINGS);
  camera.observe(basePose(0, 0, 0), 0);
  const turn = 2 * SETTINGS.standstill_rotation_tolerance;
  assert.strictEqual(camera.observe(basePose(0, 0, turn), 0.1), AutomaticCamera.OVERVIEW);
});

test('the robot is faced again once its base has rested for the standstill duration', function () {
  const AutomaticCamera = loadAutomaticCamera();
  const camera = AutomaticCamera.create(SETTINGS);
  camera.observe(basePose(0, 0, 0), 0);
  camera.observe(basePose(1, 0, 0), 0.1);
  const rested = 0.1 + SETTINGS.standstill_duration;
  assert.strictEqual(camera.observe(basePose(1, 0, 0), rested - 0.01), AutomaticCamera.OVERVIEW);
  assert.strictEqual(camera.observe(basePose(1, 0, 0), rested), AutomaticCamera.ROBOT_FACING);
});

test('a base creeping in steps below the tolerance still counts as moving', function () {
  const AutomaticCamera = loadAutomaticCamera();
  const camera = AutomaticCamera.create(SETTINGS);
  camera.observe(basePose(0, 0, 0), 0);
  const creep = 0.6 * SETTINGS.standstill_translation_tolerance;
  camera.observe(basePose(creep, 0, 0), 0.1);
  assert.strictEqual(camera.observe(basePose(2 * creep, 0, 0), 0.2), AutomaticCamera.OVERVIEW);
});
