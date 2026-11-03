const BrowserSource = require('./browser_source');
// Unit tests for web/core/screen-pointing.js (node:test): what the viewer reports about
// the camera it shows and where it draws a calibration mark.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const WEB = path.join(__dirname, '..', '..', '..', 'cramera', 'src', 'cramera', 'web');

function loadScreenPointing() {
  const scope = {};
  new Function('window', BrowserSource.read(path.join(WEB, 'core/screen-pointing.js')))(scope);
  return scope.ScreenPointing;
}

// %% the report of the shown camera

const VIEW = { position: [6.8, 0.6, 3.0], target: [2.6, 2.8, 0.7] };

test('the report carries the view the camera shows', function () {
  const report = loadScreenPointing().shownCameraReport(VIEW, 45, 16 / 9, 1000);
  assert.deepStrictEqual(report.viewpoint, VIEW);
});

test('the report carries the field of view, the aspect ratio and the time shown', function () {
  const report = loadScreenPointing().shownCameraReport(VIEW, 45, 16 / 9, 1000);
  assert.deepStrictEqual(
    [report.vertical_field_of_view, report.aspect_ratio, report.shown_at_epoch_ms],
    [45, 16 / 9, 1000]
  );
});

// %% the calibration mark

test('a calibration mark is placed at its share of the shown scene', function () {
  const placement = loadScreenPointing().markPlacement({ horizontal: 0.25, vertical: 0.75 });
  assert.deepStrictEqual(placement, { left: '25%', top: '75%', display: 'block' });
});

test('no calibration mark is drawn when there is none', function () {
  assert.strictEqual(loadScreenPointing().markPlacement(null).display, 'none');
});
