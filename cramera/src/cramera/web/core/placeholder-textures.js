/* ============================================================================
 * core/placeholder-textures.js — textures for bodies that come without one: an
 * untextured body of a plain grey or white is drawn with a texture of what its
 * name says it is (wood, metal, fabric, plaster, painted fronts, or neutral grain),
 * so a scene reads as furniture rather than as grey boxes. A body with a texture
 * or a colour of its own, or one that is see-through, is left as it is.
 *
 * The textures are drawn on a canvas, so no image files are needed.
 * ==========================================================================*/
(function (global) {
  'use strict';

  // %% what a body's name says it is

  //: what an untextured body is drawn as
  const Kind = Object.freeze({
    WOOD: 'wood',
    METAL: 'metal',
    FABRIC: 'fabric',
    PLASTER: 'plaster',
    PAINTED: 'painted',
    NEUTRAL: 'neutral',
  });

  //: the words of a body's name that make it a kind, the first kind matching wins
  const NAME_WORDS = [
    [Kind.WOOD, ['table', 'countertop', 'worktop', 'desk', 'shelf', 'bench']],
    [Kind.METAL, ['oven', 'dishwasher', 'fridge', 'refrigerator', 'sink', 'tap',
      'cooktop', 'hob', 'coffe', 'microwave', 'handle', 'kettle']],
    [Kind.FABRIC, ['sofa', 'armchair', 'couch', 'cushion', 'bed']],
    [Kind.PLASTER, ['wall', 'ceiling']],
    [Kind.PAINTED, ['cabinet', 'drawer', 'door', 'wardrobe', 'island', 'side_',
      'panel', 'underbar']],
  ];

  //: the edge length one texture tile covers, in metres, per kind
  const TILE_SIZE = {
    wood: 1.0, metal: 0.5, fabric: 0.3, plaster: 1.0, painted: 0.5, neutral: 0.5,
  };

  /* The kind a body's name says it is. */
  function kindOf(name) {
    const lower = (name || '').toLowerCase();
    for (const [kind, words] of NAME_WORDS) {
      if (words.some(function (word) { return lower.indexOf(word) !== -1; })) return kind;
    }
    return Kind.NEUTRAL;
  }

  // %% texture coordinates

  /* Texture coordinates for a triangle list (x, y, z per corner, three corners per
   * triangle): each triangle is projected onto the axis plane it faces most, one
   * texture tile per ``tileSize`` metres. */
  function boxProjectedUvs(positions, tileSize) {
    const uvs = new Float32Array(positions.length / 3 * 2);
    for (let corner = 0; corner < positions.length / 3; corner += 3) {
      const p = function (k, axis) { return positions[(corner + k) * 3 + axis]; };
      const ax = p(1, 0) - p(0, 0), ay = p(1, 1) - p(0, 1), az = p(1, 2) - p(0, 2);
      const bx = p(2, 0) - p(0, 0), by = p(2, 1) - p(0, 1), bz = p(2, 2) - p(0, 2);
      const normal = [
        Math.abs(ay * bz - az * by), Math.abs(az * bx - ax * bz), Math.abs(ax * by - ay * bx),
      ];
      const facing = normal.indexOf(Math.max.apply(null, normal));
      const [u, v] = [[1, 2], [0, 2], [0, 1]][facing];
      for (let k = 0; k < 3; k++) {
        uvs[(corner + k) * 2] = p(k, u) / tileSize;
        uvs[(corner + k) * 2 + 1] = p(k, v) / tileSize;
      }
    }
    return uvs;
  }

  // %% dressing a body

  /* Whether a material is drawn plain: no texture or vertex colours of its own, a
   * grey or white colour and not see-through. */
  function isPlain(material) {
    if (material.map || material.vertexColors || material.transparent || !material.color) {
      return false;
    }
    const c = material.color;
    const brightest = Math.max(c.r, c.g, c.b), darkest = Math.min(c.r, c.g, c.b);
    return brightest - darkest < 0.08 && brightest > 0.35;
  }

  /* A copy of a plain material drawn with the texture of ``kind``. */
  function dressedMaterial(material, kind, textureFor) {
    if (!isPlain(material)) return material;
    const dressed = material.clone();
    dressed.map = textureFor(kind);
    dressed.color.setRGB(1, 1, 1);
    if (kind === Kind.METAL) { dressed.metalness = 0.5; dressed.roughness = 0.35; }
    dressed.needsUpdate = true;
    return dressed;
  }

  /* Draw every plain material of ``object`` and its children with the texture
   * ``textureFor`` gives for the kind ``name`` says the body is; a mesh without
   * texture coordinates is given box-projected ones. */
  function applyTo(object, name, textureFor) {
    const kind = kindOf(name);
    object.traverse(function (child) {
      if (!child.isMesh) return;
      if (![].concat(child.material).some(isPlain)) return;
      if (!child.geometry.getAttribute('uv')) {
        if (child.geometry.index) child.geometry = child.geometry.toNonIndexed();
        const positions = child.geometry.getAttribute('position').array;
        child.geometry.setAttribute('uv', new THREE.BufferAttribute(
          boxProjectedUvs(positions, TILE_SIZE[kind]), 2));
      }
      child.material = Array.isArray(child.material)
        ? child.material.map(function (m) { return dressedMaterial(m, kind, textureFor); })
        : dressedMaterial(child.material, kind, textureFor);
    });
  }

  // %% drawing the textures

  //: the base colour each kind's texture is drawn on
  const BASE_COLOUR = {
    wood: '#b08657', metal: '#b9bdc1', fabric: '#8693a3',
    plaster: '#e4e0d8', painted: '#efede8', neutral: '#d4d4d4',
  };

  /* A random number source that draws the same textures every time. */
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Speckle the canvas with ``count`` dots, lighter or darker by up to ``strength``. */
  function speckle(context, size, random, count, strength) {
    for (let i = 0; i < count; i++) {
      const light = random() < 0.5;
      context.fillStyle = light
        ? 'rgba(255,255,255,' + (random() * strength) + ')'
        : 'rgba(0,0,0,' + (random() * strength) + ')';
      context.fillRect(Math.floor(random() * size), Math.floor(random() * size), 2, 2);
    }
  }

  /* Draw the texture of ``kind`` on a ``size`` by ``size`` canvas context. */
  function draw(kind, context, size) {
    const random = seededRandom(Object.values(Kind).indexOf(kind) + 1);
    context.fillStyle = BASE_COLOUR[kind];
    context.fillRect(0, 0, size, size);
    if (kind === Kind.WOOD) {
      for (let line = 0; line < 48; line++) {
        const y = random() * size, wave = 2 + random() * 4, phase = random() * Math.PI * 2;
        context.strokeStyle = 'rgba(90,58,30,' + (0.12 + random() * 0.2) + ')';
        context.lineWidth = 1 + random() * 2;
        context.beginPath();
        for (let x = 0; x <= size; x += 8) {
          const yy = y + Math.sin(x / size * Math.PI * 2 + phase) * wave;
          if (x === 0) context.moveTo(x, yy); else context.lineTo(x, yy);
        }
        context.stroke();
      }
      speckle(context, size, random, 1200, 0.05);
    } else if (kind === Kind.METAL) {
      for (let line = 0; line < 400; line++) {
        context.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        context.fillRect(0, Math.floor(random() * size), size, 1);
      }
    } else if (kind === Kind.FABRIC) {
      context.fillStyle = 'rgba(0,0,0,0.10)';
      for (let i = 0; i < size; i += 4) {
        context.fillRect(i, 0, 1, size);
        context.fillRect(0, i, size, 1);
      }
      speckle(context, size, random, 1500, 0.06);
    } else if (kind === Kind.PLASTER) {
      speckle(context, size, random, 5000, 0.06);
    } else if (kind === Kind.PAINTED) {
      speckle(context, size, random, 1500, 0.03);
    } else {
      speckle(context, size, random, 2500, 0.05);
    }
  }

  global.PlaceholderTextures = {
    Kind: Kind,
    kindOf: kindOf,
    boxProjectedUvs: boxProjectedUvs,
    applyTo: applyTo,
    draw: draw,
  };
})(window);
