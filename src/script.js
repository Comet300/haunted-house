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
  new THREE.PlaneGeometry(20 * meter, 20 * meter),
  new THREE.MeshStandardMaterial({ roughness: 0.7 })
);
floor.rotateX(-Math.PI / 2); // -90 deg around X axis
scene.add(floor);

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
  new THREE.MeshStandardMaterial()
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
  new THREE.MeshStandardMaterial()
);
roof.rotateY(Math.PI / 4);
roof.position.y = wallsMeasurements.height - 0.75 * meter;
house.add(roof);

// door
const door = new THREE.Mesh(
  new THREE.PlaneGeometry(2.2, 2.2),
  new THREE.MeshStandardMaterial()
);
door.position.y = 0;
door.position.z = 2 * meter + 0.01;
house.add(door);

house.position.y = wallsMeasurements.height / 2; // move house above the ground

// bushes
const bushGeometry = new THREE.SphereGeometry(1, 16, 16);
const bushMaterial = new THREE.MeshStandardMaterial();

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
const graveMaterial = new THREE.MeshStandardMaterial();
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
const ambientLight = new THREE.AmbientLight("#ffffff", 0.5);
scene.add(ambientLight);

/**
 * Directional light
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
directionalLight.position.set(3 * meter, 2 * meter, -8 * meter);
scene.add(directionalLight);

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
