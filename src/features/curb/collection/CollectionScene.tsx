'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { activeSensor, advance, CAPTURES, defectPosition, DURATION, poseAt, routeAt, SENSORS, type SensorId, type Transport } from './simulation';
import type { FeedCanvases } from './CameraViews';
import styles from './collection.module.css';

type Props = {
  transport: RefObject<Transport>;
  feeds: RefObject<FeedCanvases>;
  onTime: (seconds: number) => void;
  onPause: () => void;
  onFailure: (reason: string) => void;
  onSensor: (sensor: SensorId) => void;
  onHiddenSensorFocus: (sensor: SensorId) => void;
  selectedSensor: SensorId;
};

export default function CollectionScene({ transport, feeds, onTime, onPause, onFailure, onSensor, onHiddenSensorFocus, selectedSensor }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    const layer = overlay.current;
    if (!container || !layer) return;
    let renderer: THREE.WebGLRenderer;
    let context: WebGL2RenderingContext | null = null;
    try {
      const canvas = document.createElement('canvas');
      context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
      if (!context) { onFailure('3D rendering is unavailable on this device.'); return; }
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
    } catch {
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      onFailure('The 3D scene could not start on this device.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('data-scene-canvas', 'true');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#cbd9d2');
    scene.fog = new THREE.Fog('#cbd9d2', 22, 43);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const sensorViews = {
      forward: new THREE.PerspectiveCamera(61, 16 / 9, 0.016, 45),
      surface: new THREE.PerspectiveCamera(82, 16 / 9, 0.016, 14),
      curb: new THREE.PerspectiveCamera(68, 16 / 9, 0.016, 34),
    };
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 4.25;
    controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minPolarAngle = 0.06;
    controls.zoomSpeed = 0.6;
    // Touch swipes scroll the page; the named viewpoints provide touch access.
    // OrbitControls otherwise overrides touchAction with 'none' on connect.
    controls.touches.ONE = null;
    controls.touches.TWO = null;
    renderer.domElement.style.touchAction = 'pan-y';

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const instances: THREE.InstancedMesh[] = [];
    const material = (color: string, roughness = 0.8) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness }); materials.add(mat); return mat;
    };
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value; };
    const box = geometry(new THREE.BoxGeometry(1, 1, 1));
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 20));

    function grain(mat: THREE.MeshStandardMaterial, base: string, marks: readonly string[], count: number, seed: number, repeats: number) {
      const tile = document.createElement('canvas'); tile.width = 192; tile.height = 192;
      const pen = tile.getContext('2d');
      if (!pen) return;
      const next = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      pen.fillStyle = base;
      pen.fillRect(0, 0, tile.width, tile.height);
      for (let i = 0; i < count; i++) {
        pen.fillStyle = marks[i % marks.length];
        pen.fillRect(next() * 192, next() * 192, 0.35 + next() * 2.25, 0.35 + next() * 1.45);
      }
      const texture = new THREE.CanvasTexture(tile);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeats, repeats);
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      mat.map = texture;
      mat.color.set('white');
      textures.add(texture);
    }
    const palette = {
      concrete: material('#d8d3c3'), darkConcrete: material('#cbc6b7'), curb: material('#bab7a8'),
      grass: material('#a5b68e'), leaf: material('#6b875b'), bark: material('#81735b'),
      cream: material('#f6efdb', 0.45), green: material('#24543e', 0.45), rubber: material('#26322c'),
      hub: material('#819184', 0.5), lens: material('#142f2c', 0.25), trim: material('#a0aa97'),
      amber: material('#b7752d'), cyan: material('#397b80'), road: material('#666963'), seal: material('#80796a'),
      darkGreen: material('#123d31', 0.48), silver: material('#777f77', 0.38), seam: material('#40453d'),
      glass: material('#3a6262', 0.16), stripe: material('#c4a46b'), tread: material('#353b36'),
    };
    function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, position: number[], scale?: number[]) {
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(position[0], position[1], position[2]);
      if (scale) obj.scale.set(scale[0], scale[1], scale[2]);
      obj.castShadow = true; obj.receiveShadow = true;
      parent.add(obj); return obj;
    }
    const cube = (parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[]) => mesh(box, mat, parent, p, s);
    grain(palette.concrete, '#c7bda6', ['#a19c893b', '#f4edde82', '#796e542b'], 2800, 23, 1);
    grain(palette.darkConcrete, '#bcb49f', ['#a69d8878', '#ded1b96b', '#756e5c35'], 2600, 44, 1);
    grain(palette.road, '#5a625e', ['#323b3b81', '#bab9a42e', '#747b7799'], 3400, 57, 8);
    grain(palette.grass, '#7c9364', ['#52714180', '#b6bb7f80', '#485e3c63'], 2400, 19, 7);
    scene.add(new THREE.HemisphereLight('#f4f8ef', '#89917b', 2.02));
    const sun = new THREE.DirectionalLight('#fff0d9', 2.85);
    sun.position.set(-4, 9, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 36 });
    sun.shadow.normalBias = 0.019; sun.shadow.bias = -0.00018;
    sun.shadow.radius = 3;
    scene.add(sun);
    const fill = new THREE.DirectionalLight('#bdd6cf', 0.52);
    fill.position.set(3, 4, -6);
    scene.add(fill);
    cube(scene, palette.grass, [0, -0.22, -2], [36, 0.3, 22]);
    cube(scene, palette.road, [0, -0.175, 5.29], [36, 0.24, 6.45]);
    cube(scene, palette.seal, [0, -0.041, 2.128], [26, 0.018, 0.083]);
    for (const x of [-11, -7, -3, 1, 5, 9, 13]) {
      const stripe = cube(scene, palette.stripe, [x, -0.053, 5.15], [1.8, 0.006, 0.033]);
      stripe.castShadow = false;
    }
    // The ground is level; cracks/patches are visual examples, not surveyed barriers.
    for (let i = -6; i <= 6; i++) {
      cube(scene, i % 3 === 0 ? palette.darkConcrete : palette.concrete, [i * 1.8, -0.06, 0], [1.786, 0.12, 3.6]);
      cube(scene, palette.curb, [i * 1.8, -0.035, 1.924], [1.788, 0.17, 0.246]);
    }
    function groundShape(points: readonly (readonly [number, number])[], material: THREE.Material, parent: THREE.Object3D, height: number) {
      const shape = new THREE.Shape();
      points.forEach(([x, z], index) => {
        if (index === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
      });
      shape.closePath();
      const feature = mesh(geometry(new THREE.ShapeGeometry(shape)), material, parent, [0, height, 0]);
      feature.rotation.x = -Math.PI / 2;
      feature.castShadow = false;
    }
    const recessed = material('#514536');
    const fractureEdge = material('#a9987b');
    const darkPatch = material('#9d9075');
    grain(darkPatch, '#a6987e', ['#5c54446e', '#d0c6ac99', '#826f4d44'], 1700, 83, 1);
    const fracture: readonly (readonly [number, number])[] = [
      [-0.08, -0.47], [-0.033, -0.41], [-0.046, -0.36], [-0.01, -0.29], [-0.037, -0.245],
      [-0.08, -0.18], [-0.069, -0.132], [-0.031, -0.109], [0.035, -0.04], [0.019, 0.024],
      [-0.03, 0.13], [0.038, 0.19], [0.032, 0.224], [0.065, 0.26], [0.018, 0.38], [0.055, 0.49],
    ];
    function crackRibbon(points: readonly (readonly [number, number])[], width: number, mat: THREE.Material, parent: THREE.Object3D, y: number) {
      const positions = points.map(([x, z], i) => [x - width * (i % 3 === 0 ? 0.45 : 1), z] as const);
      const otherSide = points.map(([x, z], i) => [x + width * (i % 2 ? 0.74 : 1), z] as const).reverse();
      groundShape([...positions, ...otherSide], mat, parent, y);
    }
    for (const item of CAPTURES) {
      const pos = defectPosition(item);
      const feature = new THREE.Group();
      feature.position.set(pos.x, 0, pos.z);
      feature.rotation.y = -routeAt(item.fraction).heading;
      scene.add(feature);
      if (item.kind === 'crack') {
        crackRibbon(fracture, 0.014, fractureEdge, feature, 0.004);
        crackRibbon(fracture, 0.0065, recessed, feature, 0.006);
        crackRibbon([[0.035, -0.04], [0.08, -0.013], [0.115, 0.035], [0.127, 0.062], [0.19, 0.09], [0.23, 0.19]], 0.0045, recessed, feature, 0.007);
        crackRibbon([[-0.068, -0.132], [-0.102, -0.101], [-0.147, -0.013], [-0.183, 0.02]], 0.0038, recessed, feature, 0.007);
      } else {
        groundShape([[-0.25, -0.21], [-0.035, -0.28], [0.19, -0.26], [0.27, -0.11], [0.21, 0.13],
          [0.1, 0.27], [-0.14, 0.23], [-0.24, 0.1]], darkPatch, feature, 0.004);
        const fleck = geometry(new THREE.IcosahedronGeometry(1, 0));
        for (let i = 0; i < 25; i++) {
          const k = (i + 1) * 13.7;
          const pebble = mesh(fleck, i % 3 === 0 ? recessed : fractureEdge, feature,
            [Math.sin(k) * 0.21, 0.008, Math.cos(k * 1.13) * 0.21], [0.017, 0.004, 0.013]);
          pebble.castShadow = false;
        }
      }
    }
    // A planted verge and a set-back masonry facade give the camera views
    // depth without adding obstacles to the simulated route.
    const canopy = geometry(new THREE.IcosahedronGeometry(1, 2));
    const foliage = [palette.leaf, material('#54734f'), material('#829663')];
    const trees = [[-8.8, -4.65, 0.94], [-4.65, -4.85, 0.84], [1.45, -4.3, 1.1], [7.25, -5.1, 0.95], [11.2, -4.8, 0.77]];
    const soil = material('#7a7056');
    const roundBed = geometry(new THREE.CircleGeometry(1, 18));
    for (const [x, z, scale] of trees) {
      const bed = mesh(roundBed, soil, scene, [x, -0.067, z], [0.64 * scale, 0.44 * scale, 1]);
      bed.rotation.x = -Math.PI / 2; bed.castShadow = false;
      mesh(cylinder, palette.bark, scene, [x, 1.05 * scale, z], [0.105 * scale, 2.3 * scale, 0.105 * scale]);
      const branch = mesh(cylinder, palette.bark, scene, [x + 0.16, 1.66 * scale, z], [0.051 * scale, 0.92 * scale, 0.051 * scale]);
      branch.rotation.z = -0.42;
      const offsets = [[-0.36, 2.19, 0.18, 0.59], [0.39, 2.4, 0.1, 0.62], [0, 2.78, -0.12, 0.72], [-0.42, 2.63, -0.23, 0.45], [0.12, 3.13, -0.06, 0.48]];
      offsets.forEach(([dx, y, dz, r], i) => {
        const crown = mesh(canopy, foliage[i % foliage.length], scene,
          [x + dx * scale, y * scale, z + dz * scale], [r * scale, r * 1.27 * scale, r * 0.95 * scale]);
        crown.rotation.set(y, dx + x, dz);
      });
    }
    const facade = material('#aaa38e');
    const masonry = material('#817a69');
    const stone = material('#c4b89c');
    const windowMat = material('#5a7069', 0.56);
    cube(scene, facade, [0, 1.6, -9.1], [24, 3.45, 2.9]);
    cube(scene, masonry, [0, 0.26, -7.61], [24, 0.62, 0.18]);
    cube(scene, stone, [0, 3.29, -9.07], [24.3, 0.17, 3.26]);
    for (let x = -10.2; x <= 10.2; x += 2.55) {
      cube(scene, stone, [x, 1.95, -7.61], [0.96, 1.34, 0.15]);
      cube(scene, windowMat, [x, 1.95, -7.522], [0.82, 1.19, 0.03]);
      cube(scene, stone, [x, 1.76, -7.497], [0.83, 0.045, 0.026]);
      cube(scene, stone, [x, 1.94, -7.498], [0.047, 1.19, 0.026]);
      cube(scene, stone, [x, 1.28, -7.51], [1.04, 0.082, 0.22]);
    }
    const tuft = geometry(new THREE.ConeGeometry(0.072, 0.24, 4));
    const blades = new THREE.InstancedMesh(tuft, foliage[0], 96);
    const transform = new THREE.Object3D();
    for (let i = 0; i < blades.count; i++) {
      const offset = Math.sin(i * 12.73);
      transform.position.set(-11.3 + i * 0.235, 0.005, -1.97 - (i % 6) * 0.14 + offset * 0.09);
      transform.rotation.set(offset * 0.32, i * 1.9, offset * 0.18);
      transform.scale.setScalar(0.38 + (1 + offset) * 0.35);
      transform.updateMatrix();
      blades.setMatrixAt(i, transform.matrix);
    }
    blades.receiveShadow = true;
    scene.add(blades);
    instances.push(blades);
    const drain = material('#343e3a');
    cube(scene, palette.seam, [2.55, -0.050, 2.235], [0.67, 0.024, 0.29]);
    for (let i = 0; i < 9; i++) {
      cube(scene, drain, [2.26 + i * 0.072, -0.034, 2.234], [0.035, 0.014, 0.25]);
    }

    const robot = new THREE.Group();
    const initialPose = poseAt(transport.current.seconds);
    robot.position.set(initialPose.x, 0, initialPose.z);
    robot.rotation.y = -initialPose.heading;
    scene.add(robot);
    const roundedBody = geometry(new RoundedBoxGeometry(1.55, 0.73, 1.05, 4, 0.15));
    mesh(geometry(new RoundedBoxGeometry(1.64, 0.25, 1.05, 3, 0.073)), palette.darkGreen, robot, [0, 0.571, 0]);
    cube(robot, palette.seam, [0, 0.41, 0], [1.42, 0.22, 0.83]);
    mesh(roundedBody, palette.cream, robot, [0, 0.995, 0]);
    mesh(geometry(new RoundedBoxGeometry(1.51, 0.044, 1, 3, 0.021)), palette.seam, robot, [0, 1.304, 0]);
    mesh(geometry(new RoundedBoxGeometry(1.53, 0.11, 1.02, 3, 0.05)), palette.cream, robot, [0, 1.374, 0]);
    mesh(geometry(new RoundedBoxGeometry(0.52, 0.05, 0.38, 3, 0.024)), palette.trim, robot, [-0.20, 1.428, 0]);
    const bumper = geometry(new RoundedBoxGeometry(0.16, 0.126, 1.10, 3, 0.045));
    mesh(bumper, palette.rubber, robot, [0.783, 0.555, 0]);
    mesh(bumper, palette.rubber, robot, [-0.783, 0.555, 0]);
    for (const sign of [-1, 1]) {
      cube(robot, palette.darkGreen, [-0.035, 0.727, sign * 0.514], [1.19, 0.06, 0.038]);
      cube(robot, palette.silver, [-0.08, 0.727, sign * 0.538], [0.73, 0.016, 0.013]);
      cube(robot, palette.amber, [0.817, 0.596, sign * 0.369], [0.075, 0.036, 0.16]);
      cube(robot, palette.seam, [-0.716, 0.89, sign * 0.383], [0.055, 0.11, 0.06]);
      for (let i = 0; i < 4; i++) cube(robot, palette.seam, [-0.62 + i * 0.035, 0.793, sign * 0.529], [0.011, 0.033, 0.006]);
    }
    for (const x of [-0.52, 0, 0.52]) {
      const axle = mesh(cylinder, palette.silver, robot, [x, 0.255, 0], [0.028, 1.19, 0.028]);
      axle.rotation.x = Math.PI / 2;
    }

    const tire = geometry(new THREE.CylinderGeometry(0.228, 0.228, 0.154, 24));
    const hub = geometry(new THREE.CylinderGeometry(0.137, 0.137, 0.019, 20));
    const sidewall = geometry(new THREE.TorusGeometry(0.173, 0.012, 6, 24));
    const cap = geometry(new THREE.CylinderGeometry(0.047, 0.047, 0.024, 12));
    const bolt = geometry(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 6));
    const tread = geometry(new THREE.BoxGeometry(0.047, 0.026, 0.070));
    const lug = new THREE.Object3D();
    const wheels: THREE.Group[] = [];
    for (const x of [-0.52, 0, 0.52]) for (const sign of [-1, 1]) {
      const strut = mesh(cylinder, palette.silver, robot, [x - 0.044, 0.385, sign * 0.50], [0.036, 0.28, 0.036]);
      strut.rotation.z = -0.35;
      const mount = cube(robot, palette.darkGreen, [x - 0.087, 0.50, sign * 0.493], [0.12, 0.11, 0.09]);
      mount.rotation.z = -0.18;
      const wheel = new THREE.Group(); wheel.position.set(x, 0.24, sign * 0.58); robot.add(wheel);
      const rubber = mesh(tire, palette.rubber, wheel, [0, 0, 0]); rubber.rotation.x = Math.PI / 2;
      mesh(sidewall, palette.tread, wheel, [0, 0, sign * 0.079]);
      const center = mesh(hub, palette.hub, wheel, [0, 0, sign * 0.079]); center.rotation.x = Math.PI / 2;
      const axleCap = mesh(cap, palette.darkGreen, wheel, [0, 0, sign * 0.094]); axleCap.rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const nut = mesh(bolt, palette.silver, wheel, [Math.sin(a) * 0.088, Math.cos(a) * 0.088, sign * 0.095]);
        nut.rotation.x = Math.PI / 2; nut.castShadow = false;
      }
      const lugs = new THREE.InstancedMesh(tread, palette.tread, 28);
      for (let i = 0; i < lugs.count; i++) {
        const a = (i + (i % 2) * 0.36) * Math.PI / 14;
        lug.position.set(Math.sin(a) * 0.225, Math.cos(a) * 0.225, (i % 2 ? 1 : -1) * 0.043);
        lug.rotation.set(0, 0, -a);
        lug.updateMatrix();
        lugs.setMatrixAt(i, lug.matrix);
      }
      lugs.castShadow = true; lugs.receiveShadow = true;
      wheel.add(lugs);
      instances.push(lugs);
      wheels.push(wheel);
    }
    // Generate the wordmark locally. This is not a remote font or image.
    const mark = document.createElement('canvas'); mark.width = 256; mark.height = 96;
    const pen = mark.getContext('2d');
    if (pen) {
      pen.fillStyle = '#24543e'; pen.font = 'bold 64px sans-serif'; pen.textAlign = 'center'; pen.textBaseline = 'middle'; pen.fillText('CURB', 128, 50);
      const texture = new THREE.CanvasTexture(mark); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      const wordmark = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, transparent: true, depthWrite: false }); materials.add(wordmark);
      const logo = mesh(geometry(new THREE.PlaneGeometry(0.79, 0.296)), wordmark, robot, [-0.15, 1.014, 0.53]);
      logo.castShadow = false;
    }
    mesh(cylinder, palette.darkGreen, robot, [0.36, 1.44, 0], [0.089, 0.042, 0.089]);
    mesh(cylinder, palette.silver, robot, [0.36, 1.622, 0], [0.036, 0.34, 0.036]);
    mesh(cylinder, palette.darkGreen, robot, [0.36, 1.778, 0], [0.053, 0.106, 0.053]);
    cube(robot, palette.seam, [0.821, 0.516, 0.43], [0.242, 0.076, 0.104]);
    cube(robot, palette.seam, [-0.23, 0.81, 0.532], [0.23, 0.109, 0.08]);
    const sensors: Record<SensorId, THREE.Mesh> = {
      forward: mesh(geometry(new RoundedBoxGeometry(0.2, 0.16, 0.28, 3, 0.04)), palette.green, robot, [0.46, 1.85, 0]),
      surface: mesh(geometry(new RoundedBoxGeometry(0.16, 0.11, 0.18, 3, 0.03)), palette.amber, robot, [0.94, 0.49, 0.43]),
      curb: mesh(geometry(new RoundedBoxGeometry(0.19, 0.15, 0.12, 3, 0.03)), palette.cyan, robot, [-0.23, 0.81, 0.57]),
    };
    for (const sensor of Object.values(sensors)) {
      sensor.material = (sensor.material as THREE.MeshStandardMaterial).clone();
      materials.add(sensor.material);
    }
    const barrelGeometry = geometry(new THREE.CylinderGeometry(0.052, 0.061, 0.021, 18));
    const glassGeometry = geometry(new THREE.CylinderGeometry(0.034, 0.034, 0.010, 18));
    const lensAxes = { forward: new THREE.Vector3(1, 0, 0), surface: new THREE.Vector3(0, -1, 0), curb: new THREE.Vector3(0, 0, 1) };
    const lensOffsets = { forward: 0.103, surface: 0.057, curb: 0.063 };
    const axisUp = new THREE.Vector3(0, 1, 0);
    const lightGeometry = geometry(new THREE.SphereGeometry(0.015, 10, 6));
    const indicators = Object.fromEntries(SENSORS.map(({ id, color }) => {
      const axis = lensAxes[id];
      const barrel = mesh(barrelGeometry, palette.lens, sensors[id], axis.clone().multiplyScalar(lensOffsets[id]).toArray());
      barrel.quaternion.setFromUnitVectors(axisUp, axis);
      const glass = mesh(glassGeometry, palette.glass, barrel, [0, 0.012, 0]);
      glass.castShadow = false;
      const diode = material('#eee4bb', 0.38);
      diode.emissive.set(color);
      const lampPosition = id === 'forward' ? [0.064, 0.059, 0.113] : id === 'surface' ? [0.045, 0.008, 0.084] : [0.063, 0.048, 0.063];
      const lamp = mesh(lightGeometry, diode, sensors[id], lampPosition);
      lamp.castShadow = false;
      return [id, diode];
    })) as Record<SensorId, THREE.MeshStandardMaterial>;

    function frustum(id: SensorId, color: string, corners: number[][]) {
      const origin = sensors[id].position;
      const vertices: number[] = [];
      for (let i = 0; i < 4; i++) vertices.push(origin.x, origin.y, origin.z, ...corners[i], ...corners[(i + 1) % 4]);
      const geo = geometry(new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.085, side: THREE.DoubleSide, depthWrite: false }); materials.add(mat);
      const cone = new THREE.Mesh(geo, mat); robot.add(cone);
      const edgeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }); materials.add(edgeMat);
      const edges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(geo)), edgeMat); cone.add(edges);
      return cone;
    }
    const cones = {
      forward: frustum('forward', '#347a60', [[3.4, 0.025, -1.15], [3.4, 0.025, 1.15], [1.5, 0.025, 1.05], [1.5, 0.025, -1.05]]),
      surface: frustum('surface', '#b58233', [[0.25, 0.03, 0.03], [1.25, 0.03, 0.03], [1.25, 0.03, 0.95], [0.25, 0.03, 0.95]]),
      curb: frustum('curb', '#348496', [[-1.4, 0.04, 1.78], [1.1, 0.04, 1.78], [1.1, -0.02, 2.5], [-1.4, -0.02, 2.5]]),
    };
    const scanMaterial = new THREE.MeshBasicMaterial({ color: '#b68135', transparent: true, opacity: 0, depthWrite: false });
    materials.add(scanMaterial);
    const scan = new THREE.Mesh(geometry(new THREE.RingGeometry(0.28, 0.29, 32)), scanMaterial);
    scan.rotation.x = -Math.PI / 2;
    scan.visible = false;
    scene.add(scan);
    const trailMaterial = material('#627c50');
    const trail = CAPTURES.map(capture => {
      const { x, z } = defectPosition(capture);
      const marker = mesh(geometry(new THREE.TorusGeometry(0.14, 0.014, 5, 24)), trailMaterial, scene, [x, 0.03, z - 0.66]);
      marker.rotation.x = Math.PI / 2; return marker;
    });

    const paths = SENSORS.map(sensor => layer.querySelector<SVGPathElement>(`[data-leader="${sensor.id}"]`)!);
    const dots = SENSORS.map(sensor => layer.querySelector<SVGCircleElement>(`[data-dot="${sensor.id}"]`)!);
    const labels = SENSORS.map(sensor => layer.querySelector<HTMLButtonElement>(`[data-label="${sensor.id}"]`)!);
    const world = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    const rayDirection = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const intersections: THREE.Intersection[] = [];
    const occluders: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && !object.material.transparent) occluders.push(object);
    });
    const normals = { forward: new THREE.Vector3(1, 0, 0), surface: new THREE.Vector3(0.5, -0.5, 0.7).normalize(), curb: new THREE.Vector3(0, 0, 1) };
    let width = 1, height = 1, stopped = false, visible = true, frame = 0, previous = 0;
    let dirty = true, feedDirty = true, lastReset = -1, previousTime = -1, lastFeed = -Infinity, lastPublish = -Infinity, lastPaint = -Infinity;
    let lastFeedSensor: SensorId | undefined;
    let orbiting = false, drawing = false;

    const feedPose = {
      forward: [new THREE.Vector3(0.588, 1.85, 0), new THREE.Vector3(4.65, 0.56, 0)],
      surface: [new THREE.Vector3(0.94, 0.411, 0.43), new THREE.Vector3(1.14, 0.008, 0.43)],
      curb: [new THREE.Vector3(-0.23, 0.81, 0.66), new THREE.Vector3(0.88, -0.05, 2.25)],
    } as const;
    const target = new THREE.Vector3();
    const previews = feeds.current.previews;
    const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

    function copyFeed(canvas: HTMLCanvasElement | null | undefined, pixelsWide: number, pixelsHigh: number,
      id: SensorId, pose: ReturnType<typeof poseAt>, isMain: boolean) {
      if (!canvas) return;
      let pen = contexts.get(canvas);
      if (!pen) {
        pen = canvas.getContext('2d', { alpha: false }) ?? undefined;
        if (!pen) return;
        contexts.set(canvas, pen);
      }
      const targetWidth = isMain ? pixelsWide : Math.min(168, pixelsWide);
      const targetHeight = Math.round(targetWidth * 9 / 16);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      pen.drawImage(renderer.domElement, 0, renderer.domElement.height - pixelsHigh, pixelsWide, pixelsHigh,
        0, 0, targetWidth, targetHeight);
      canvas.dataset.frameCamera = id;
      canvas.dataset.frameTime = pose.time.toFixed(3);
      canvas.dataset.frameInspection = pose.inspection?.id ?? '';
    }

    function drawFeeds(pose: ReturnType<typeof poseAt>, selected: SensorId, reducedMotion: boolean) {
      renderer.setScissorTest(true);
      robot.updateMatrixWorld(true);
      for (const { id } of SENSORS) {
        const isMain = id === selected;
        const cameraFeed = sensorViews[id];
        const [eye, destination] = feedPose[id];
        cameraFeed.position.copy(eye);
        robot.localToWorld(cameraFeed.position);
        target.copy(destination);
        robot.localToWorld(target);
        if (id === 'surface') {
          const zoom = reducedMotion ? 0 : pose.zoom;
          if (pose.inspection) {
            const point = defectPosition(pose.inspection);
            world.set(point.x, 0.005, point.z);
            target.lerp(world, zoom);
          }
          cameraFeed.up.set(Math.cos(pose.heading), 0, Math.sin(pose.heading));
          cameraFeed.fov = 84 - 35 * zoom;
          cameraFeed.updateProjectionMatrix();
        }
        cameraFeed.lookAt(target);
        const viewportWidth = Math.floor(Math.max(16, Math.min(isMain ? 496 : 146, width, height * 16 / 9)));
        const viewportHeight = Math.max(9, Math.round(viewportWidth * 9 / 16));
        renderer.setViewport(0, 0, viewportWidth, viewportHeight);
        renderer.setScissor(0, 0, viewportWidth, viewportHeight);
        renderer.render(scene, cameraFeed);
        const ratio = renderer.getPixelRatio();
        const pixelsWide = Math.round(viewportWidth * ratio);
        const pixelsHigh = Math.round(viewportHeight * ratio);
        copyFeed(previews[id], pixelsWide, pixelsHigh, id, pose, false);
        if (isMain) copyFeed(feeds.current.focus, pixelsWide, pixelsHigh, id, pose, true);
      }
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, width, height);
    }

    function setView() {
      const config = transport.current;
      const pose = poseAt(config.seconds);
      const aspect = width / height;
      const extra = aspect < 1.3 ? 1.14 : 1;
      controls.target.set(pose.x + 0.56, 0.50, pose.z - 0.16);
      if (config.view === 'follow') camera.position.set(pose.x + 3.32 * extra, 2.95 * extra, pose.z + 4.95 * extra);
      if (config.view === 'side') camera.position.set(pose.x + 0.24, 2.65 * extra, pose.z + 7.8 * extra);
      if (config.view === 'overhead') { controls.target.set(0, 0, 0); camera.position.set(0.3, aspect < 1.3 ? 23 : 19, 1); }
      camera.lookAt(controls.target); controls.update(); lastReset = config.reset; orbiting = false; dirty = true;
    }
    function resize() {
      const rect = container!.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      setView();
      changed();
    }
    function beginOrbit() { orbiting = true; onPause(); changed(); }
    function changed() {
      if (drawing) return;
      feedDirty = true;
      orbitChanged();
    }
    function orbitChanged() {
      if (drawing) return;
      dirty = true;
      resume();
    }
    controls.addEventListener('start', beginOrbit);
    controls.addEventListener('change', orbitChanged);

    function leaders() {
      const svg = layer!.querySelector('svg')!;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      for (let i = 0; i < SENSORS.length; i++) {
        const sensor = SENSORS[i];
        sensors[sensor.id].getWorldPosition(world);
        normal.copy(normals[sensor.id]).transformDirection(robot.matrixWorld);
        cameraDirection.copy(camera.position).sub(world).normalize();
        projected.copy(world).project(camera);
        let show = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.99 && Math.abs(projected.y) < 0.99 && normal.dot(cameraDirection) > 0.025;
        if (show) {
          rayDirection.copy(world).sub(camera.position);
          raycaster.far = Math.max(0, rayDirection.length() - 0.025);
          raycaster.set(camera.position, rayDirection.normalize());
          raycaster.intersectObjects(occluders, false, intersections);
          show = !intersections.some(hit => {
            let object: THREE.Object3D | null = hit.object;
            while (object) { if (object === sensors[sensor.id]) return false; object = object.parent; }
            return true;
          });
          intersections.length = 0;
        }
        // Preserve the camera action in the tab order before hiding its moving
        // callout. The parent focuses the matching stable sidebar control.
        if (!show && labels[i].contains(document.activeElement)) onHiddenSensorFocus(sensor.id);
        labels[i].style.visibility = show ? 'visible' : 'hidden';
        paths[i].style.visibility = show ? 'visible' : 'hidden';
        dots[i].style.visibility = show ? 'visible' : 'hidden';
        if (!show) continue;
        const px = (projected.x + 1) / 2 * width;
        const py = (1 - projected.y) / 2 * height;
        const label = labels[i];
        const ex = label.offsetLeft + (i === 0 ? label.offsetWidth : 0);
        const ey = label.offsetTop + label.offsetHeight / 2;
        const bend = ex + (px > ex ? 18 : -18);
        paths[i].setAttribute('d', `M${px.toFixed(2)},${py.toFixed(2)} L${bend.toFixed(2)},${ey.toFixed(2)} L${ex.toFixed(2)},${ey.toFixed(2)}`);
        dots[i].setAttribute('cx', px.toFixed(2)); dots[i].setAttribute('cy', py.toFixed(2));
      }
    }

    function render(now: number) {
      frame = 0;
      if (stopped || !visible || document.hidden) { previous = 0; return; }
      const config = transport.current;
      if (config.running && now - lastPaint < 1000 / 30) { resume(); return; }
      drawing = true;
      lastPaint = now;
      const delta = config.running && previous ? Math.min((now - previous) / 1000, 0.15) : 0;
      previous = config.running ? now : 0;
      if (config.running) {
        config.seconds = advance(config.seconds, delta, config.speed);
        if (config.seconds >= DURATION) {
          config.running = false;
          onTime(DURATION);
          onPause();
        } else if (now - lastPublish >= 100) {
          onTime(config.seconds);
          lastPublish = now;
        }
      }
      const pose = poseAt(config.seconds);
      const sensor = activeSensor(pose.time, config.manualSensor, config.autoInspect, config.reducedMotion);
      const moved = pose.time !== previousTime;
      if (moved) {
        const shiftX = pose.x - robot.position.x;
        const shiftZ = pose.z - robot.position.z;
        if (shiftX !== 0 || shiftZ !== 0 || robot.rotation.y !== -pose.heading) renderer.shadowMap.needsUpdate = true;
        robot.position.set(pose.x, 0, pose.z);
        robot.rotation.y = -pose.heading;
        wheels.forEach(wheel => { wheel.rotation.z = -pose.wheelAngle; });
        if (!orbiting && config.view !== 'overhead') {
          camera.position.x += shiftX;
          camera.position.z += shiftZ;
          controls.target.x += shiftX;
          controls.target.z += shiftZ;
          controls.update();
        }
        trail.forEach((marker, index) => { marker.visible = pose.time >= CAPTURES[index].at; });
        previousTime = pose.time;
      }
      if (config.reset !== lastReset) setView();
      if (dirty || moved) {
        scan.visible = false;
        for (const item of SENSORS) {
          cones[item.id].visible = false;
          const mat = sensors[item.id].material as THREE.MeshStandardMaterial;
          mat.emissive.set(item.id === sensor ? item.color : '#000000');
          mat.emissiveIntensity = item.id === sensor ? 0.12 : 0;
          indicators[item.id].emissiveIntensity = item.id === sensor ? 0.9 : 0.06;
        }
        // Publish interaction changes and the exact ending frame immediately.
        // Throttle only incidental preview frames during continuous playback.
        if (feedDirty || (!config.running && moved) || sensor !== lastFeedSensor || (moved && now - lastFeed >= 90)) {
          drawFeeds(pose, sensor, config.reducedMotion);
          lastFeed = now;
          lastFeedSensor = sensor;
          feedDirty = false;
        }
        if (pose.inspection && sensor === 'surface') {
          const point = defectPosition(pose.inspection);
          const emphasis = config.reducedMotion ? 0.7 : pose.zoom;
          scan.position.set(point.x, 0.011, point.z);
          scan.scale.setScalar(1.12 - 0.14 * emphasis);
          scanMaterial.opacity = 0.34 * emphasis;
          scan.visible = emphasis > 0;
        }
        cones[sensor].visible = config.coverage;
        renderer.render(scene, camera);
        leaders();
        dirty = false;
      }
      drawing = false;
      if (config.running) resume();
    }
    function resume() {
      if (!stopped && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
    }
    function suspend() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }
    function visibility() {
      if (document.hidden) suspend();
      else changed();
    }
    transport.current.invalidate = changed;
    function contextLost(event: Event) {
      event.preventDefault();
      const focused = labels.findIndex(label => label.contains(document.activeElement));
      if (focused !== -1) onHiddenSensorFocus(SENSORS[focused].id);
      onFailure('The 3D graphics context was lost.');
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibility);
    const observer = new ResizeObserver(resize); observer.observe(container);
    const observed = new Map<Element, boolean>();
    const intersection = new IntersectionObserver(entries => {
      entries.forEach(entry => observed.set(entry.target, entry.isIntersecting));
      visible = [...observed.values()].some(Boolean);
      if (visible) changed(); else suspend();
    });
    intersection.observe(container);
    const feedPanel = feeds.current.focus?.closest('aside');
    if (feedPanel) intersection.observe(feedPanel);
    resize(); resume();
    return () => {
      stopped = true;
      suspend();
      if (transport.current.invalidate === changed) delete transport.current.invalidate;
      observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('start', beginOrbit); controls.removeEventListener('change', orbitChanged); controls.dispose();
      instances.forEach(item => item.dispose());
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
      sun.shadow.dispose(); renderer.dispose();
      // dispose() releases Three's resources, but some GL driver caches remain
      // until context destruction. This canvas owns its context exclusively.
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [transport, feeds, onTime, onPause, onFailure, onHiddenSensorFocus]);

  return <div className={styles.scene} ref={overlay}>
    <div className={styles.scene} ref={host} role="img" aria-label="Illustrative six-wheel delivery-style robot moving along a miniature sidewalk with a crack and rough patch, three camera mounts and selected camera coverage." />
    <svg className={styles.leaders} aria-hidden="true">{SENSORS.map(sensor => <g key={sensor.id}><path data-leader={sensor.id} /><circle data-dot={sensor.id} r="3.5" /></g>)}</svg>
    {SENSORS.map(sensor => <button key={sensor.id} className={`${styles.anchorLabel} ${styles[sensor.id]}`} data-label={sensor.id} aria-label={`Camera ${sensor.number}, ${sensor.name}`} aria-pressed={selectedSensor === sensor.id} onClick={() => onSensor(sensor.id)}><span>CAMERA {sensor.number}</span>{sensor.name}</button>)}
  </div>;
}
