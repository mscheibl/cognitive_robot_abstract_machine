'use strict';
// Unit tests for the robot scene panel's reports of the camera it shows the scene
// through (node:test): every live viewer the page attaches to learns the camera, also
// when the view stays the one the page showed for the viewer before.

const assert = require('node:assert/strict');
const test = require('node:test');
const ScenePanelFunctions = require('./scene_panel_functions');

// %% a page attaching to one live viewer after another

const SETTINGS = {
  overview: {position: [6.8, 0.6, 3.0], target: [2.6, 2.8, 0.7]},
  robot_facing: {distance: 2.5, height: 1.6, target_height: 1.0},
  standstill_duration: 1.0,
  standstill_translation_tolerance: 0.01,
  standstill_rotation_tolerance: 0.0175,
};

const BASE = [1.3, 2.0, 0, 0, 0, 0, 1];

class PageAttachingToViewers extends ScenePanelFunctions {
  constructor() {
    const point = () => ({copy: () => {}});
    super({
      window: {location: {search: '', hostname: 'localhost'}},
      SceneContext: {automaticCamera: () => true}, performance,
      automaticCamera: null, automaticCameraShot: null, shownView: null,
      camera: {position: point(), fov: 45, aspect: 16 / 9},
      controls: {target: point()},
      fetch: () => Promise.resolve({json: () => ({camera: SETTINGS})}),
    }, ['automatic-camera.js']);
    this.reports = 0;
    this.scope.worldPoint = zUp => zUp;
    this.scope.unobstructedRobotFacingView = () => SETTINGS.overview;
    this.scope.reportShownCamera = () => { this.reports += 1; };
  }

  //: attach to a viewer and let it see the robot standing at ``BASE``
  async attachAndWatchTheRobotStand() {
    this.scope.loadAutomaticCamera();
    await new Promise(resolve => setImmediate(resolve));
    this.scope.aimAutomaticCamera(BASE);
  }
}

// %% reporting

test('every viewer the page attaches to is told the camera, also for an unchanged view', async () => {
  const page = new PageAttachingToViewers();
  await page.attachAndWatchTheRobotStand();
  await page.attachAndWatchTheRobotStand();
  assert.equal(page.reports, 2);
});

test('a viewer is told an unchanged view only once', async () => {
  const page = new PageAttachingToViewers();
  await page.attachAndWatchTheRobotStand();
  page.scope.aimAutomaticCamera(BASE);
  assert.equal(page.reports, 1);
});
