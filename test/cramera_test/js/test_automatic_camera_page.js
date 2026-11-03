const BrowserSource = require('./browser_source');
// Unit tests for the page class config.js sets for an automatic camera (node:test): an
// audience watching the robot sees the scene without the viewer's controls.
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const WEB = path.join(__dirname, '..', '..', '..', 'cramera', 'src', 'cramera', 'web');

//: the classes config.js puts on the root element for a page opened with ``search``
function rootClassesFor(search) {
  const classes = new Set();
  global.window = { location: { search: search } };
  global.window.self = global.window;
  global.window.top = global.window;
  global.document = { documentElement: { classList: { add: function (name) { classes.add(name); } } } };
  new Function(BrowserSource.read(path.join(WEB, 'core/scene.js')))();
  global.SceneContext = window.SceneContext;
  new Function(BrowserSource.read(path.join(WEB, 'config.js')))();
  return classes;
}

test('a page with an automatic camera hides the viewer controls', function () {
  const classes = rootClassesFor('?layout=scene&camera=automatic');
  assert.ok(classes.has(window.SceneContext.AUTOMATIC_CAMERA_CLASS));
});

test('a page without an automatic camera keeps the viewer controls', function () {
  const classes = rootClassesFor('?layout=scene');
  assert.ok(!classes.has(window.SceneContext.AUTOMATIC_CAMERA_CLASS));
});
