'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { advance, CAPTURES, DURATION, poseAt, SENSORS, type SensorId, type Transport } from './simulation';
import styles from './collection.module.css';

type Props = {
  transport: RefObject<Transport>;
  onTime: (seconds: number) => void;
  onPause: () => void;
  onFailure: (reason: string) => void;
  onSensor: (sensor: SensorId) => void;
  onHiddenSensorFocus: (sensor: SensorId) => void;
  selectedSensor: SensorId;
};

export default function CollectionScene({ transport, onTime, onPause, onFailure, onSensor, onHiddenSensorFocus, selectedSensor }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    const layer = overlay.current;
    if (!container || !layer) return;
    let renderer: THREE.WebGLRenderer;
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
      if (!context) { onFailure('3D rendering is unavailable on this device.'); return; }
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
    } catch {
      onFailure('The 3D scene could not start on this device.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.className = styles.canvas;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.setAttribute('data-scene-canvas', 'true');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e7ecdf');
    scene.fog = new THREE.Fog('#e7ecdf', 22, 48);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 5;
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
    const material = (color: string, roughness = 0.8) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness }); materials.add(mat); return mat;
    };
    const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value; };
    const box = geometry(new THREE.BoxGeometry(1, 1, 1));
    const palette = {
      concrete: material('#d8d3c3'), darkConcrete: material('#cbc6b7'), curb: material('#bab7a8'),
      grass: material('#a5b68e'), leaf: material('#6b875b'), bark: material('#81735b'),
      cream: material('#f6efdb', 0.45), green: material('#24543e', 0.45), rubber: material('#26322c'),
      hub: material('#819184', 0.5), lens: material('#142f2c', 0.25), trim: material('#a0aa97'),
      amber: material('#bb853b'), cyan: material('#367a83'), road: material('#acb2a4'), crack: material('#776d59'),
    };
    function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, position: number[], scale?: number[]) {
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(position[0], position[1], position[2]);
      if (scale) obj.scale.set(scale[0], scale[1], scale[2]);
      obj.castShadow = true; obj.receiveShadow = true;
      parent.add(obj); return obj;
    }
    const cube = (parent: THREE.Object3D, mat: THREE.Material, p: number[], s: number[]) => mesh(box, mat, parent, p, s);
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 20));
    scene.add(new THREE.HemisphereLight('#fff6dd', '#91a78b', 2.8));
    const sun = new THREE.DirectionalLight('#fff1cf', 4.2);
    sun.position.set(-3, 12, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 36 });
    sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.0002;
    scene.add(sun);
    cube(scene, palette.grass, [0, -0.22, -2], [36, 0.3, 22]);
    cube(scene, palette.road, [0, -0.13, 5], [36, 0.25, 5]);
    // The ground is level; cracks/patches are visual examples, not surveyed barriers.
    for (let i = -6; i <= 6; i++) {
      cube(scene, i % 3 === 0 ? palette.darkConcrete : palette.concrete, [i * 1.8, -0.06, 0], [1.78, 0.12, 3.6]);
      cube(scene, palette.curb, [i * 1.8, -0.035, 1.94], [1.78, 0.17, 0.26]);
    }
    const crackCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.007, -1.6), new THREE.Vector3(0.08, 0.007, -1.04),
      new THREE.Vector3(-0.13, 0.007, -0.65), new THREE.Vector3(0.14, 0.007, -0.1),
      new THREE.Vector3(0.03, 0.007, 0.3), new THREE.Vector3(0.23, 0.007, 0.9), new THREE.Vector3(0.1, 0.007, 1.6),
    ]);
    mesh(geometry(new THREE.TubeGeometry(crackCurve, 32, 0.018, 4, false)), palette.crack, scene, [0, 0, 0]);
    cube(scene, palette.darkConcrete, [4.2, 0.006, -0.75], [0.9, 0.013, 0.75]);
    for (let i = 0; i < 28; i++) {
      const x = 3.8 + ((i * 17) % 29) / 29 * 0.8;
      const z = -1.05 + ((i * 11) % 31) / 31 * 0.6;
      cube(scene, i % 2 ? palette.crack : palette.concrete, [x, 0.018, z], [0.04, 0.02, 0.055]);
    }
    // A quiet backdrop keeps the moving robot and its cameras dominant.
    const canopy = geometry(new THREE.IcosahedronGeometry(1, 1));
    for (const x of [-9, -3.7, 3.8, 10]) {
      mesh(cylinder, palette.bark, scene, [x, 1, -4], [0.12, 2.1, 0.12]);
      mesh(canopy, palette.leaf, scene, [x, 2.5, -4], [0.95, 1.15, 0.85]);
      mesh(canopy, palette.grass, scene, [x + 0.4, 2.9, -4.1], [0.62, 0.8, 0.6]);
    }
    const building = material('#b8c0ac');
    const windowMat = material('#879983');
    cube(scene, building, [0, 1.5, -9], [23, 3.3, 3]);
    cube(scene, palette.trim, [0, 3.2, -9], [23.3, 0.16, 3.3]);
    for (let x = -10; x <= 10; x += 2.4) cube(scene, windowMat, [x, 1.75, -7.47], [0.8, 1.3, 0.03]);
    const tuft = geometry(new THREE.ConeGeometry(0.1, 0.32, 4));
    for (let i = 0; i < 44; i++) mesh(tuft, i % 3 ? palette.leaf : palette.grass, scene, [-10 + i * 0.48, 0.05, -2.2 - (i % 4) * 0.17]);

    const robot = new THREE.Group();
    robot.position.x = poseAt(transport.current.seconds).x;
    scene.add(robot);
    const roundedBody = geometry(new RoundedBoxGeometry(1.55, 0.78, 1.05, 4, 0.16));
    cube(robot, palette.rubber, [0, 0.47, 0], [1.43, 0.28, 0.94]);
    mesh(roundedBody, palette.cream, robot, [0, 0.99, 0]);
    // A distinct lid seam, separate lid, bumper and trim rail.
    mesh(geometry(new RoundedBoxGeometry(1.48, 0.05, 1, 3, 0.07)), palette.green, robot, [0, 1.3, 0]);
    mesh(geometry(new RoundedBoxGeometry(1.48, 0.09, 1, 3, 0.07)), palette.cream, robot, [0, 1.37, 0]);
    mesh(geometry(new RoundedBoxGeometry(0.18, 0.16, 0.97, 3, 0.05)), palette.green, robot, [0.76, 0.57, 0]);
    cube(robot, palette.trim, [-0.1, 0.65, 0.528], [1.15, 0.04, 0.012]);

    const tire = geometry(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 24));
    const hub = geometry(new THREE.CylinderGeometry(0.135, 0.135, 0.165, 16));
    const tread = geometry(new THREE.BoxGeometry(0.045, 0.018, 0.16));
    const wheels: THREE.Group[] = [];
    for (const x of [-0.52, 0, 0.52]) for (const z of [-0.58, 0.58]) {
      const wheel = new THREE.Group(); wheel.position.set(x, 0.245, z); robot.add(wheel);
      const rubber = mesh(tire, palette.rubber, wheel, [0, 0, 0]); rubber.rotation.x = Math.PI / 2;
      const center = mesh(hub, palette.hub, wheel, [0, 0, 0]); center.rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        const strip = mesh(tread, palette.rubber, wheel, [Math.sin(a) * 0.239, Math.cos(a) * 0.239, 0]);
        strip.rotation.z = -a;
      }
      const spoke = cube(wheel, palette.trim, [0, 0, z > 0 ? 0.085 : -0.085], [0.16, 0.025, 0.008]);
      spoke.castShadow = false;
      wheels.push(wheel);
    }
    // Generate the wordmark locally. This is not a remote font or image.
    const mark = document.createElement('canvas'); mark.width = 256; mark.height = 96;
    const pen = mark.getContext('2d');
    if (pen) {
      pen.fillStyle = '#f6efdb'; pen.fillRect(0, 0, 256, 96);
      pen.fillStyle = '#24543e'; pen.font = 'bold 64px sans-serif'; pen.textAlign = 'center'; pen.textBaseline = 'middle'; pen.fillText('CURB', 128, 50);
      const texture = new THREE.CanvasTexture(mark); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      const wordmark = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }); materials.add(wordmark);
      const logo = mesh(geometry(new THREE.PlaneGeometry(0.75, 0.28)), wordmark, robot, [-0.1, 1.01, 0.529]);
      logo.castShadow = false;
    }
    mesh(cylinder, palette.green, robot, [0.36, 1.6, 0], [0.026, 0.45, 0.026]);
    const sensors: Record<SensorId, THREE.Mesh> = {
      forward: mesh(geometry(new RoundedBoxGeometry(0.2, 0.16, 0.28, 3, 0.04)), palette.green, robot, [0.46, 1.85, 0]),
      surface: mesh(geometry(new RoundedBoxGeometry(0.16, 0.11, 0.18, 3, 0.03)), palette.amber, robot, [0.94, 0.49, 0.43]),
      curb: mesh(geometry(new RoundedBoxGeometry(0.19, 0.15, 0.12, 3, 0.03)), palette.cyan, robot, [-0.23, 0.81, 0.57]),
    };
    for (const sensor of Object.values(sensors)) {
      sensor.material = (sensor.material as THREE.MeshStandardMaterial).clone();
      materials.add(sensor.material);
    }
    const lens = geometry(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 16));
    const forwardLens = mesh(lens, palette.lens, sensors.forward, [0.107, 0, 0]); forwardLens.rotation.z = Math.PI / 2;
    mesh(lens, palette.lens, sensors.surface, [0, -0.06, 0]);
    const sideLens = mesh(lens, palette.lens, sensors.curb, [0, 0, 0.07]); sideLens.rotation.x = Math.PI / 2;

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
    const trailMaterial = material('#708d59');
    const trail = CAPTURES.map(capture => {
      const marker = mesh(geometry(new THREE.TorusGeometry(0.15, 0.017, 5, 24)), trailMaterial, scene, [capture.x, 0.035, -1.35]);
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
    const occluders: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) occluders.push(object);
    });
    const normals = { forward: new THREE.Vector3(1, 0, 0), surface: new THREE.Vector3(0.5, -0.5, 0.7).normalize(), curb: new THREE.Vector3(0, 0, 1) };
    let width = 1, height = 1, stopped = false, visible = true, frame = 0, previous = 0, lastPublish = 0;
    let dirty = true, lastReset = -1, previousTime = -1, lastSensor = '', lastCoverage = false;
    let orbiting = false;

    function setView() {
      const config = transport.current;
      const pose = poseAt(config.seconds);
      const aspect = width / height;
      const extra = aspect < 1.3 ? 1.25 : 1;
      controls.target.set(pose.x + 0.5, 0.45, 0);
      if (config.view === 'follow') camera.position.set(pose.x + 5.2 * extra, 4.2 * extra, 7.5 * extra);
      if (config.view === 'side') camera.position.set(pose.x + 0.4, 2.8 * extra, 10 * extra);
      if (config.view === 'overhead') { controls.target.set(0, 0, 0); camera.position.set(0.3, aspect < 1.3 ? 23 : 19, 1); }
      camera.lookAt(controls.target); controls.update(); lastReset = config.reset; orbiting = false; dirty = true;
    }
    function resize() {
      const rect = container!.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      setView();
    }
    function beginOrbit() { orbiting = true; onPause(); dirty = true; }
    function changed() { dirty = true; }
    controls.addEventListener('start', beginOrbit);
    controls.addEventListener('change', changed);

    function leaders() {
      const svg = layer!.querySelector('svg')!;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      for (let i = 0; i < SENSORS.length; i++) {
        const sensor = SENSORS[i];
        sensors[sensor.id].getWorldPosition(world);
        normal.copy(normals[sensor.id]).transformDirection(robot.matrixWorld);
        cameraDirection.copy(camera.position).sub(world).normalize();
        projected.copy(world).project(camera);
        rayDirection.copy(world).sub(camera.position);
        raycaster.set(camera.position, rayDirection.clone().normalize());
        raycaster.far = Math.max(0, rayDirection.length() - 0.025);
        const occluded = raycaster.intersectObjects(occluders, false).some(hit => {
          let object: THREE.Object3D | null = hit.object;
          while (object) { if (object === sensors[sensor.id]) return false; object = object.parent; }
          return true;
        });
        const show = !occluded && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 0.99 && Math.abs(projected.y) < 0.99 && normal.dot(cameraDirection) > 0.025;
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
      if (stopped || !visible || document.hidden) { frame = 0; previous = 0; return; }
      frame = requestAnimationFrame(render);
      const config = transport.current;
      const delta = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
      previous = now;
      if (config.running) {
        config.seconds = advance(config.seconds, delta, config.speed);
        if (config.seconds >= DURATION) { config.running = false; onTime(DURATION); onPause(); }
        if (now - lastPublish > 120) { onTime(config.seconds); lastPublish = now; }
      }
      const pose = poseAt(config.seconds);
      if (pose.time !== previousTime) {
        const movement = pose.x - robot.position.x;
        robot.position.x = pose.x;
        wheels.forEach(wheel => { wheel.rotation.z = -pose.wheelAngle; });
        if (!orbiting && config.view !== 'overhead') { camera.position.x += movement; controls.target.x += movement; controls.update(); }
        trail.forEach((marker, index) => { marker.visible = pose.time >= CAPTURES[index].at; });
        previousTime = pose.time; dirty = true;
      }
      if (config.reset !== lastReset) setView();
      if (lastSensor !== config.sensor || lastCoverage !== config.coverage) {
        for (const item of SENSORS) {
          cones[item.id].visible = config.coverage && item.id === config.sensor;
          const mat = sensors[item.id].material as THREE.MeshStandardMaterial;
          mat.emissive.set(item.id === config.sensor ? item.color : '#000000');
          mat.emissiveIntensity = item.id === config.sensor ? 0.25 : 0;
        }
        lastSensor = config.sensor; lastCoverage = config.coverage; dirty = true;
      }
      if (dirty) {
        renderer.render(scene, camera); leaders(); dirty = false;
      }
    }
    function resume() { if (!stopped && visible && !document.hidden && !frame) { previous = 0; dirty = true; frame = requestAnimationFrame(render); } }
    function visibility() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previous = 0; }
      else resume();
    }
    function contextLost(event: Event) {
      event.preventDefault();
      const focused = labels.findIndex(label => label.contains(document.activeElement));
      if (focused !== -1) onHiddenSensorFocus(SENSORS[focused].id);
      onFailure('The 3D graphics context was lost.');
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibility);
    const observer = new ResizeObserver(resize); observer.observe(container);
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) resume(); else { cancelAnimationFrame(frame); frame = 0; previous = 0; }
    }); intersection.observe(container);
    resize(); resume();
    return () => {
      stopped = true; cancelAnimationFrame(frame);
      observer.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      controls.removeEventListener('start', beginOrbit); controls.removeEventListener('change', changed); controls.dispose();
      geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
      sun.shadow.dispose(); renderer.dispose();
      // dispose() releases Three's resources, but some GL driver caches remain
      // until context destruction. This canvas owns its context exclusively.
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [transport, onTime, onPause, onFailure, onHiddenSensorFocus]);

  return <div className={styles.scene} ref={overlay}>
    <div className={styles.scene} ref={host} role="img" aria-label="Illustrative six-wheel delivery-style robot moving along a miniature sidewalk with a crack and rough patch, three camera mounts and selected camera coverage." />
    <svg className={styles.leaders} aria-hidden="true">{SENSORS.map(sensor => <g key={sensor.id}><path data-leader={sensor.id} /><circle data-dot={sensor.id} r="3.5" /></g>)}</svg>
    {SENSORS.map(sensor => <button key={sensor.id} className={`${styles.anchorLabel} ${styles[sensor.id]}`} data-label={sensor.id} aria-label={`Camera ${sensor.number}, ${sensor.name}`} aria-pressed={selectedSensor === sensor.id} onClick={() => onSensor(sensor.id)}><span>CAMERA {sensor.number}</span>{sensor.name}</button>)}
  </div>;
}
