'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const ScenePanelFunctions = require('./scene_panel_functions');

// %% bodies whose mesh file was exported together with a light
class ExportedLightScene extends ScenePanelFunctions {
  constructor() {
    const webDirectory = path.join(__dirname, '../../../cramera/src/cramera/web');
    const THREE = {...require(path.join(webDirectory, 'vendor/three.min.js'))};
    THREE.GLTFLoader = class {
      load(url, onLoad) {
        const exported = new THREE.Group();
        exported.add(new THREE.PointLight(0xffffff, 1));
        exported.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
        onLoad({scene: exported});
      }
    };
    super({
      THREE, objectMeshes: {}, objectPending: {}, objectIdByKey: {}, objectKeyById: {},
      objectLabels: {}, worldRoot: new THREE.Group(), labelsOn: false, needsRender: false,
    }, ['shape-specs.js']);
    this.scope.makeLabel = () => new THREE.Group();
    this.scope.refreshFrameAxes = () => {};
  }

  lightsAndMeshesOf(key) {
    const found = {lights: 0, meshes: 0};
    this.scope.objectMeshes[key].traverse(child => {
      if (child.isLight) found.lights += 1;
      if (child.isMesh) found.meshes += 1;
    });
    return found;
  }
}

test('a body drawn from one mesh file brings none of its lights into the scene', () => {
  const scene = new ExportedLightScene();
  scene.scope.addObject({key: 'oven', id: 'oven', meshUrl: 'oven.glb'});
  assert.deepEqual(scene.lightsAndMeshesOf('oven'), {lights: 0, meshes: 1});
});

test('a body published shape by shape brings none of its mesh lights into the scene', () => {
  const scene = new ExportedLightScene();
  scene.scope.addObject({
    key: 'oven', id: 'oven',
    shapes: [{kind: 'mesh', mesh: '/mesh?path=oven.glb', format: 'glb'}],
  });
  assert.deepEqual(scene.lightsAndMeshesOf('oven'), {lights: 0, meshes: 1});
});
