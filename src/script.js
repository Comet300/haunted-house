import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Timer } from "three/addons/misc/Timer.js";
import GUI from "lil-gui";

// Setup & Config
// --------------

/**
 * * Conventions:
 * Base unit: meter
 * Floor level: 0
 */
const meter = 1; // base unit. Only defined for readability purposes.

/**
 * Debug tools
 */
const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

/**
 * Renderer & sizes
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer?.setSize(sizes.width, sizes.height);
  renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Textures
// ---------
const textureLodaer = new THREE.TextureLoader();

/**
 * Async loads a teture.
 *
 * Automatically enables S T wrapping.
 *
 * @param {string} url
 * @returns {Promise<THREE.Texture>}
 */
const loadTextureAsync = async (url) => {
  const texture = await textureLodaer.loadAsync(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

// My preference compared to having all variables named "xxxxTexture"
const textures = {};

// floor textures
textures.floorAlpha = await loadTextureAsync("./ground/alpha.jpg");
textures.floorDiffusion = await loadTextureAsync(
  "./ground/leafy_grass_diff_1k.jpg"
); // a.k.a. Color
textures.floorDiffusion.colorSpace = THREE.SRGBColorSpace;
textures.floorDisplacement = await loadTextureAsync(
  "./ground/leafy_grass_disp_1k.jpg"
);
textures.floorNormal = await loadTextureAsync(
  "./ground/leafy_grass_nor_gl_1k.jpg"
);
textures.floorARM = await loadTextureAsync("./ground/leafy_grass_arm_1k.jpg");

textures.floorDiffusion.repeat.set(8, 8); // how many copies of itself should be on X and Z axis
textures.floorARM.repeat.set(8, 8);
textures.floorDisplacement.repeat.set(8, 8);
textures.floorNormal.repeat.set(8, 8);

// wall textures
textures.wallDiffusion = await loadTextureAsync(
  "./wall/red_brick_plaster_patch_02_diff_1k.jpg"
);
textures.wallARM = await loadTextureAsync(
  "./wall/red_brick_plaster_patch_02_arm_1k.jpg"
);
textures.wallNormal = await loadTextureAsync(
  "./wall/red_brick_plaster_patch_02_nor_gl_1k.jpg"
);

// roof textures

textures.roofDiffusion = await loadTextureAsync(
  "./roof/roof_slates_02_diff_1k.jpg"
);
textures.roofARM = await loadTextureAsync("./roof/roof_slates_02_arm_1k.jpg");
textures.roofNormal = await loadTextureAsync(
  "./roof/roof_slates_02_nor_gl_1k.jpg"
);

// KNOWN BUG: light bounces off weirdly, texture skewed.
// Solution: use custom blender geometry with proper UV mapping.
textures.roofDiffusion.repeat.set(3, 1); // how many copies of itself should be on X and Z axis
textures.roofARM.repeat.set(3, 1);
textures.roofNormal.repeat.set(3, 1);

// bushe textures
textures.bushDiffusion = await loadTextureAsync(
  "./bush/leaves_forest_ground_diff_1k.jpg"
);
textures.bushARM = await loadTextureAsync(
  "./bush/leaves_forest_ground_arm_1k.jpg"
);
textures.bushNormal = await loadTextureAsync(
  "./bush/leaves_forest_ground_nor_gl_1k.jpg"
);
textures.bushDisplacement = await loadTextureAsync(
  "./bush/leaves_forest_ground_disp_1k.jpg"
);

// grave textures
textures.graveDiffusion = await loadTextureAsync(
  "./grave/plastered_stone_wall_diff_1k.jpg"
);
textures.graveARM = await loadTextureAsync(
  "./grave/plastered_stone_wall_arm_1k.jpg"
);
textures.graveNormal = await loadTextureAsync(
  "./grave/plastered_stone_wall_nor_gl_1k.jpg"
);

// door textures
textures.doorDiffusion = await loadTextureAsync("./door/color.jpg");
textures.doorAlpha = await loadTextureAsync("./door/alpha.jpg");
textures.doorAO = await loadTextureAsync("./door/ambientOcclusion.jpg");
textures.doorDisplacement = await loadTextureAsync("./door/normal.jpg");
textures.doorMetalness = await loadTextureAsync("./door/metalness.jpg");
textures.doorRoughness = await loadTextureAsync("./door/roughness.jpg");
textures.doorNormal = await loadTextureAsync("./door/normal.jpg");

/**
 * Scene
 */
const scene = new THREE.Scene();

// Objects
// -------

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20 * meter, 20 * meter, 100, 100),
  new THREE.MeshStandardMaterial({
    alphaMap: textures.floorAlpha,
    transparent: true,
    map: textures.floorDiffusion,
    displacementMap: textures.floorDisplacement,
    displacementScale: 0.3,
    displacementBias: -0.15,
    normalMap: textures.floorNormal,
    aoMap: textures.floorARM,
    roughnessMap: textures.floorARM,
    metalnessMap: textures.floorARM,
  })
);
floor.rotateX(-Math.PI / 2); // -90 deg around X axis
scene.add(floor);

gui
  .add(floor.material, "displacementBias")
  .min(0)
  .max(1)
  .step(0.001)
  .name("Ground displacement scale");
gui
  .add(floor.material, "displacementScale")
  .min(-1)
  .max(1)
  .step(0.001)
  .name("Ground displacement bias");

/**
 * House
 */

const house = new THREE.Group(); // everything house-related
scene.add(house);

const wallsMeasurements = {
  width: 4 * meter,
  height: 2.5 * meter,
  depth: 4 * meter,
};

// walls
const walls = new THREE.Mesh(
  new THREE.BoxGeometry(
    wallsMeasurements.width,
    wallsMeasurements.height,
    wallsMeasurements.depth
  ),
  new THREE.MeshStandardMaterial({
    map: textures.wallDiffusion,
    aoMap: textures.wallARM,
    roughnessMap: textures.wallARM,
    metalnessMap: textures.wallARM,
    normalMap: textures.wallNormal,
  })
);
house.add(walls);

// roof
const roofMeasurements = {
  width: wallsMeasurements.width,
  height: 1.5 * meter,
};
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(
    roofMeasurements.width - 0.5 * meter,
    roofMeasurements.height,
    4
  ),
  new THREE.MeshStandardMaterial({
    map: textures.roofDiffusion,
    normalMap: textures.roofNormal,
    aoMap: textures.roofARM,
    metalnessMap: textures.roofARM,
    roughnessMap: textures.roofARM,
  })
);
roof.rotateY(Math.PI / 4);
roof.position.y = wallsMeasurements.height - 0.75 * meter;
house.add(roof);

// door
const door = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 2.2),
  new THREE.MeshStandardMaterial({
    map: textures.doorDiffusion,
    aoMap: textures.doorAO,
    metalnessMap: textures.doorMetalness,
    roughnessMap: textures.doorRoughness,
    normalMap: textures.doorNormal,
    transparent: true,
    alphaMap: textures.doorAlpha,
    displacementMap: textures.doorDisplacement,
    displacementScale: 0.1,
  })
);
door.position.y = -0.2;
door.position.z = 2 * meter + 0.01;
house.add(door);

house.position.y = wallsMeasurements.height / 2; // move house above the ground

// Bushes
const bushGeometry = new THREE.SphereGeometry(1, 16, 16);
const bushMaterial = new THREE.MeshStandardMaterial({
  color: 0xccffcc,
  map: textures.bushDiffusion,
  aoMap: textures.bushARM,
  metalnessMap: textures.bushARM,
  roughnessMap: textures.bushARM,
  normalMap: textures.bushNormal,
  displacementMap: textures.bushDisplacement,
  displacementScale: 0.2,
});

const bush1 = new THREE.Mesh(bushGeometry, bushMaterial);
bush1.scale.setScalar(0.5);
bush1.position.set(0.8 * meter, -1.2 * meter, 2.2 * meter);

const bush2 = new THREE.Mesh(bushGeometry, bushMaterial);
bush2.scale.setScalar(0.25);
bush2.position.set(1.3 * meter, -1.1 * meter, 2.1 * meter);

const bush3 = new THREE.Mesh(bushGeometry, bushMaterial);
bush3.scale.setScalar(0.4);
bush3.position.set(-0.8 * meter, -1.1 * meter, 2.2 * meter);

const bush4 = new THREE.Mesh(bushGeometry, bushMaterial);
bush4.scale.setScalar(0.15);
bush4.position.set(-1 * meter, -1.15 * meter, 2.6 * meter);

house.add(bush1, bush2, bush3, bush4);

// Graves

const graveGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.2);
const graveMaterial = new THREE.MeshStandardMaterial({
  map: textures.graveDiffusion,
  aoMap: textures.graveARM,
  metalnessMap: textures.graveARM,
  roughnessMap: textures.graveARM,
  normalMap: textures.graveNormal,
  displacementScale: 0.2,
});
const graves = new THREE.Group();

const createGraveInGroup = (group) => {
  const grave = new THREE.Mesh(graveGeometry, graveMaterial);

  const radius = 3 + Math.random() * 4;
  const angle = Math.random() * Math.PI * 2;

  // random position
  grave.position.set(
    Math.sin(angle) * radius,
    Math.random() * 0.4,
    Math.cos(angle) * radius
  );

  // random incline
  grave.rotateX((Math.random() - 0.5) * 0.4);
  grave.rotateY((Math.random() - 0.5) * 0.4);
  grave.rotateZ((Math.random() - 0.5) * 0.4);

  group.add(grave);
};

for (let i = 0; i < 30; i++) {
  createGraveInGroup(graves);
}

scene.add(graves);

// Lights
// ------

/**
 * Ambient light
 */
const ambientLight = new THREE.AmbientLight("#87cefe", 0.5);
scene.add(ambientLight);

/**
 * Directional light
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 0.3);
directionalLight.position.set(3 * meter, 2 * meter, -8 * meter);
scene.add(directionalLight);

/**
 * Door light
 */
// KNOWN BUG: Light bounces off weirdly
// Solution: use custom blender geometry with proper UV mapping.
const doorLight = new THREE.PointLight("#ff7d46", 5);
doorLight.position.set(0, 0.8, 2.3);
house.add(doorLight);

// Camera
// -------

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 4 * meter;
camera.position.y = 2 * meter;
camera.position.z = 5 * meter;
scene.add(camera);

// Controls
// --------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Animations
// ----------
const timer = new Timer();

const tick = () => {
  // Timer
  timer.update();
  const elapsedTime = timer.getElapsed();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
