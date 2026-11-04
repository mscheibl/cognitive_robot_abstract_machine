'use strict';
// Unit tests for the robot scene panel's live polling (node:test): the automatic camera
// keeps watching the robot while the live state stays the same, as it does while the
// robot stands still and nothing else in the world moves.

const assert = require('node:assert/strict');
const test = require('node:test');
const ScenePanelFunctions = require('./scene_panel_functions');

// %% a live stream whose state never changes

class UnchangingLiveStream extends ScenePanelFunctions {
  constructor(state, automaticCamera) {
    super({
      window: {location: {search: '', hostname: 'localhost'}},
      lastSeq: -1, liveFails: 0, livePolls: 0,
      automaticCamera, robotModel: {},
      fetch: () => Promise.resolve({json: () => state}),
    });
    this.aimedAt = [];
    this.scope.applyLive = () => {};
    this.scope.showCalibrationMark = () => {};
    this.scope.aimAutomaticCamera = basePose => this.aimedAt.push(basePose);
  }

  async poll(times) {
    for (let i = 0; i < times; i++) {
      this.scope.livePoll();
      await new Promise(resolve => setImmediate(resolve));
    }
  }
}

const BASE = [1.3, 2.0, 0, 0, 0, 0, 1];

// %% aiming

test('the automatic camera is aimed at every poll, also while the state stays the same', async () => {
  const stream = new UnchangingLiveStream({sequenceNumber: 1, base: BASE}, {});
  await stream.poll(3);
  assert.deepEqual(stream.aimedAt, [BASE, BASE, BASE]);
});

test('without an automatic camera no poll aims the camera', async () => {
  const stream = new UnchangingLiveStream({sequenceNumber: 1, base: BASE}, null);
  await stream.poll(3);
  assert.deepEqual(stream.aimedAt, []);
});
