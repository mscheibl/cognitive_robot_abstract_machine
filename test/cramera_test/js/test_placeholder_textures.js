'use strict';
// Unit tests for web/core/placeholder-textures.js (node:test): an untextured body is
// drawn with a texture of what its name says it is, and its own texture or colour is
// kept where it has one.

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const vm = require('node:vm');
const BrowserSource = require('./browser_source');

const WEB = path.join(__dirname, '..', '..', '..', 'cramera', 'src', 'cramera', 'web');
const THREE = {...require(path.join(WEB, 'vendor/three.min.js'))};

function load() {
  const scope = vm.createContext({window: {}, THREE});
  vm.runInContext(BrowserSource.read(path.join(WEB, 'core/placeholder-textures.js')), scope);
  return scope.window.PlaceholderTextures;
}

// %% what a body's name says it is

test('the apartment bodies are drawn as what their names say they are', () => {
  const textures = load();
  const kinds = textures.Kind;
  const named = {
    table_area_main: kinds.WOOD,
    island_countertop: kinds.WOOD,
    coffee_table: kinds.WOOD,
    oven: kinds.METAL,
    coffe_machine: kinds.METAL,
    handle_cab1_top_door: kinds.METAL,
    sofa: kinds.FABRIC,
    walls: kinds.PLASTER,
    wall_coloksu_wall1: kinds.PLASTER,
    cabinet10_drawer_middle: kinds.PAINTED,
    island_waterfall_left: kinds.PAINTED,
    windows: kinds.NEUTRAL,
  };
  for (const name in named) assert.equal(textures.kindOf(name), named[name], name);
});

// %% texture coordinates

test('a face is textured by its extent along the plane it faces most, per tile', () => {
  const textures = load();
  // one triangle in the plane z = 0.3, 2 m by 1 m
  const positions = new Float32Array([0, 0, 0.3, 2, 0, 0.3, 0, 1, 0.3]);
  const uvs = textures.boxProjectedUvs(positions, 0.5);
  assert.deepEqual(Array.from(uvs), [0, 0, 4, 0, 0, 2]);
});

// %% dressing a body

function meshWith(material, geometry) {
  return new THREE.Mesh(geometry || new THREE.BoxGeometry(1, 1, 1), material);
}

function dressed(object, name) {
  const textures = load();
  const made = [];
  textures.applyTo(object, name, function (kind) {
    const texture = new THREE.Texture();
    texture.name = kind;
    made.push(kind);
    return texture;
  });
  return made;
}

test('an untextured grey body gets the texture of its kind in white', () => {
  const mesh = meshWith(new THREE.MeshStandardMaterial({color: 0xcccccc}));
  dressed(mesh, 'table_area_main');
  assert.equal(mesh.material.map.name, load().Kind.WOOD);
  assert.equal(mesh.material.color.getHex(), 0xffffff);
});

test('a body without texture coordinates is given some', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(
    [0, 0, 0.3, 2, 0, 0.3, 0, 1, 0.3], 3));
  const mesh = meshWith(new THREE.MeshStandardMaterial({color: 0xcccccc}), geometry);
  dressed(mesh, 'walls');
  assert.equal(mesh.geometry.getAttribute('uv').count, 3);
});

test('a body with a texture of its own keeps it', () => {
  const own = new THREE.Texture();
  const mesh = meshWith(new THREE.MeshStandardMaterial({color: 0xcccccc, map: own}));
  dressed(mesh, 'oven');
  assert.equal(mesh.material.map, own);
});

test('a body with a colour of its own keeps it', () => {
  const mesh = meshWith(new THREE.MeshStandardMaterial({color: 0x8b0000}));
  dressed(mesh, 'sofa');
  assert.equal(mesh.material.map, null);
  assert.equal(mesh.material.color.getHex(), 0x8b0000);
});

test('a see-through body stays untextured', () => {
  const mesh = meshWith(new THREE.MeshStandardMaterial(
    {color: 0xcccccc, transparent: true, opacity: 0.3}));
  dressed(mesh, 'windows');
  assert.equal(mesh.material.map, null);
});

test('every material of a body drawn with several is dressed', () => {
  const mesh = meshWith([
    new THREE.MeshStandardMaterial({color: 0xcccccc}),
    new THREE.MeshStandardMaterial({color: 0xdddddd}),
  ]);
  dressed(mesh, 'cabinet1');
  assert.deepEqual(mesh.material.map(material => material.map.name),
    [load().Kind.PAINTED, load().Kind.PAINTED]);
});

test('a body coloured per vertex keeps its colours', () => {
  const mesh = meshWith(new THREE.MeshStandardMaterial({color: 0xffffff, vertexColors: true}));
  dressed(mesh, 'milk.stl');
  assert.equal(mesh.material.map, null);
});
