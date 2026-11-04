'use strict';
// Unit tests for the robot scene panel's disposal of what it draws (node:test): a mesh
// drawn with several materials, as a mesh file can bring, is disposed material by
// material instead of failing on the list holding them.

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const ScenePanelFunctions = require('./scene_panel_functions');

// %% a scene holding a mesh with two materials

class SceneWithSeveralMaterials extends ScenePanelFunctions {
  constructor() {
    const webDirectory = path.join(__dirname, '../../../cramera/src/cramera/web');
    const THREE = {...require(path.join(webDirectory, 'vendor/three.min.js'))};
    super({
      THREE, objectMeshes: {}, objectLabels: {}, objectIdByKey: {}, liveSpawned: {},
      objectPending: {}, worldRoot: new THREE.Group(), markerRoot: new THREE.Group(),
    });
    this.scope.arrowOver = () => {};
    this.scope.refreshFrameAxes = () => {};
    this.disposed = [];
    this.THREE = THREE;
  }

  //: a group holding one mesh drawn with two textured materials
  meshWithTwoMaterials() {
    const materials = ['door', 'handle'].map(name => {
      const material = new this.THREE.MeshStandardMaterial({map: new this.THREE.Texture()});
      material.dispose = () => this.disposed.push(name);
      material.map.dispose = () => this.disposed.push(name + ' texture');
      return material;
    });
    const group = new this.THREE.Group();
    group.add(new this.THREE.Mesh(new this.THREE.BoxGeometry(1, 1, 1), materials));
    return group;
  }
}

const EVERY_PART = ['door texture', 'door', 'handle texture', 'handle'];

// %% disposing

test('an object drawn with several materials is removed with all of them', () => {
  const scene = new SceneWithSeveralMaterials();
  scene.scope.objectMeshes.oven = scene.meshWithTwoMaterials();
  scene.scope.removeObject('oven');
  assert.deepEqual(scene.disposed, EVERY_PART);
  assert.equal(scene.scope.objectMeshes.oven, undefined);
});

test('a marker drawn with several materials is cleared with all of them', () => {
  const scene = new SceneWithSeveralMaterials();
  scene.scope.markerRoot.add(scene.meshWithTwoMaterials());
  scene.scope.clearMarkers();
  assert.deepEqual(scene.disposed, EVERY_PART);
  assert.equal(scene.scope.markerRoot.children.length, 0);
});
