// Imperative three.js scene for the Curb robot explorer.
//
// Plain three.js (no react-three-fiber) so the viewer adds no new dependency to
// the app. React owns the UI state and drives this scene through a small
// imperative API; the scene owns the WebGL context, the auto-orbit, the
// hover-highlight overlay, the explode animation and the HTML label layer.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assetUrl, type ManifestGroup, type RobotManifest, type Vec3 } from './manifest';
import type { IndexEntry } from './groups';

const HOVER_MINT = 0x8ef0e4;
const SELECTION_BLUE = 0x2f6df6;
const EXPLODE_SCALE = 0.5;
const EXPAND_RATE = 1.8;
const CAMERA_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];

export type SceneMode = 'overview' | 'isolated' | 'exploded';

export interface RobotSceneCallbacks {
  onHoverGroup(id: string | null): void;
  onPickGroup(id: string): void;
  onExpand(): void;
  onPickEntry(groupId: string, entryKey: string): void;
  onProgress(loaded: number, total: number): void;
  onDetailState(groupId: string, state: 'loading' | 'ready' | 'error', message?: string): void;
  onContextLost(message: string): void;
}

interface PartNode {
  node: THREE.Object3D;
  base: THREE.Vector3;
  explode: THREE.Vector3;
}

interface GroupEntry {
  group: ManifestGroup;
  root: THREE.Group; // preview, shown in overview
  overlay: THREE.Object3D;
  pickMeshes: THREE.Mesh[];
  detail?: {
    root: THREE.Group;
    overlay: THREE.Object3D;
    parts: PartNode[];
    meshesByPart: Map<string, THREE.Mesh[]>;
    pickMeshes: THREE.Mesh[];
  };
  detailPromise?: Promise<NonNullable<GroupEntry['detail']>>;
  label: HTMLButtonElement;
  connector: HTMLDivElement;
}

function v(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p[0], p[1], p[2]);
}

export class RobotScene {
  private readonly host: HTMLElement;
  private readonly labelLayer: HTMLElement;
  private readonly cb: RobotSceneCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly loader = new GLTFLoader();
  private readonly pointer = new THREE.Vector2();
  private readonly overlayMaterial: THREE.MeshBasicMaterial;
  private readonly tooltip: HTMLDivElement;
  private readonly keys = new Set<string>();

  private manifest: RobotManifest | null = null;
  private overviewReady = false;
  private pendingSelection: { group: ManifestGroup; entries: IndexEntry[] } | null = null;
  private selectionVersion = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private lastFit: { target: THREE.Vector3; radius: number | null; iso: boolean } | null = null;
  private groups = new Map<string, GroupEntry>();
  private mode: SceneMode = 'overview';
  private selected: string | null = null;
  private selectedEntries: IndexEntry[] = [];
  private callouts = new Map<string, {
    el: HTMLButtonElement;
    connector: HTMLDivElement;
    anchor: THREE.Vector3;
    offset: THREE.Vector3;
  }>();
  private readonly calloutCenter = new THREE.Vector3();
  private readonly calloutCenterOffset = new THREE.Vector3();

  private hovered: string | null = null;
  private pointerInside = false;
  private dragging = false;
  private autoOrbit = true;
  private reduced = false;
  private explodeT = 0; // 0 assembled .. 1 exploded, for the selected detail group
  private raf = 0;
  private disposed = false;
  private pressInfo: { x: number; y: number; time: number } | null = null;

  constructor(host: HTMLElement, labelLayer: HTMLElement, callbacks: RobotSceneCallbacks) {
    this.host = host;
    this.labelLayer = labelLayer;
    this.cb = callbacks;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 is unavailable on this device.');
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    this.renderer.setClearColor(0xdfe6dc, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    host.appendChild(canvas);
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D robot model. Use WASD or arrow keys to move the view.');

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 25000);
    this.camera.up.set(0, 0, 1);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc1c7bc, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(800, -600, 2000);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8);
    fill.position.set(-1200, 900, 600);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 15000;
    this.controls.addEventListener('start', () => { this.dragging = true; });
    this.controls.addEventListener('end', () => { this.dragging = false; });

    this.overlayMaterial = new THREE.MeshBasicMaterial({
      color: HOVER_MINT,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'robot-tip';
    this.tooltip.setAttribute('aria-hidden', 'true');
    this.tooltip.hidden = true;
    this.labelLayer.appendChild(this.tooltip);

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('blur', this.clearKeys);
    window.addEventListener('resize', this.handleResize);

    this.loop();
  }

  async loadOverview(manifest: RobotManifest): Promise<void> {
    this.manifest = manifest;
    let loaded = 0;
    const total = manifest.groups.length;
    this.cb.onProgress(0, total);
    for (const group of manifest.groups) {
      if (this.disposed) return;
      const url = assetUrl(group.preview || group.glb);
      const gltf = await this.loader.loadAsync(url);
      if (this.disposed) {
        this.disposeObject(gltf.scene);
        return;
      }
      const root = new THREE.Group();
      root.name = `preview:${group.id}`;
      root.rotation.x = Math.PI / 2; // GLB wrapper is Y-up; restore CAD Z-up.
      const pickMeshes: THREE.Mesh[] = [];
      gltf.scene.traverse(node => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh) {
          this.tuneMaterial(mesh);
          mesh.userData.groupId = group.id;
          pickMeshes.push(mesh);
        }
      });
      root.add(gltf.scene);

      const overlay = this.makeOverlay(gltf.scene);
      root.add(overlay);
      this.scene.add(root);

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'robot-label';
      label.textContent = group.label;
      label.dataset.groupId = group.id;
      label.addEventListener('click', () => this.cb.onPickGroup(group.id));
      label.addEventListener('pointerenter', () => this.setHover(group.id));
      label.addEventListener('pointerleave', () => this.setHover(null));
      label.addEventListener('focus', () => this.setHover(group.id));
      label.addEventListener('blur', () => this.setHover(null));
      const connector = document.createElement('div');
      connector.setAttribute('aria-hidden', 'true');
      Object.assign(connector.style, {
        position: 'absolute', left: '0', top: '0', height: '1px',
        background: '#547363', transformOrigin: '0 0', pointerEvents: 'none',
      });
      this.labelLayer.append(connector, label);

      this.groups.set(group.id, { group, root, overlay, pickMeshes, label, connector });
      // The index is usable while previews load. Preserve a hover/focus that
      // began before this particular subsystem's geometry arrived.
      overlay.visible = this.mode === 'overview' && this.hovered === group.id;
      label.classList.toggle('is-hovered', overlay.visible);
      loaded += 1;
      this.cb.onProgress(loaded, total);
    }
    this.overviewReady = true;
    this.frameOverview();
    const pending = this.pendingSelection;
    this.pendingSelection = null;
    if (pending) void this.isolateGroup(pending.group, pending.entries);
  }

  private makeOverlay(source: THREE.Object3D): THREE.Object3D {
    const overlay = source.clone(true);
    overlay.scale.multiplyScalar(1.004);
    overlay.visible = false;
    overlay.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = this.overlayMaterial;
        mesh.renderOrder = 999;
      }
    });
    return overlay;
  }

  private tuneMaterial(mesh: THREE.Mesh): void {
    const src = mesh.material as THREE.MeshStandardMaterial;
    const mat = src.clone();
    if ('metalness' in mat) mat.metalness = Math.min(mat.metalness ?? 0.5, 0.2);
    if ('roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.5, 0.6);
    mat.emissive = new THREE.Color(0x000000);
    mesh.material = mat;
  }

  setReducedMotion(reduced: boolean): void {
    if (reduced && !this.reduced) this.autoOrbit = false;
    this.reduced = reduced;
    this.controls.enableDamping = !reduced;
    if (reduced) this.explodeT = this.mode === 'exploded' ? 1 : 0;
  }

  setAutoOrbit(enabled: boolean): void {
    this.autoOrbit = enabled;
  }

  async isolateGroup(group: ManifestGroup, entries: IndexEntry[]): Promise<void> {
    if (this.disposed) return;
    if (!this.overviewReady) {
      this.pendingSelection = { group, entries };
      return;
    }
    const entry = this.groups.get(group.id);
    if (!entry) return;
    const version = ++this.selectionVersion;
    this.highlightEntry(null);
    this.clearCallouts();
    this.mode = 'isolated';
    this.selected = group.id;
    this.selectedEntries = entries;
    this.setHover(null);
    this.showTooltip(null);
    this.explodeT = 0;

    // Every previous view is hidden immediately, including a cached detail view.
    for (const g of this.groups.values()) {
      g.root.visible = false;
      g.overlay.visible = false;
      if (g.detail) {
        g.detail.root.visible = false;
        g.detail.overlay.visible = false;
      }
      g.label.style.display = 'none';
      g.connector.style.display = 'none';
    }

    const isCurrent = () => !this.disposed && this.mode === 'isolated'
      && this.selected === group.id && this.selectionVersion === version;
    if (!entry.detail) {
      this.cb.onDetailState(group.id, 'loading');
      // Reopening the same group shares its in-flight request; each selection
      // still has a separate token so older continuations cannot publish state.
      entry.detailPromise ??= this.buildDetail(group)
        .then(detail => { entry.detail = detail; return detail; })
        .finally(() => { entry.detailPromise = undefined; });
      try {
        await entry.detailPromise;
      } catch (err) {
        if (isCurrent()) {
          this.cb.onDetailState(group.id, 'error', err instanceof Error ? err.message : String(err));
        }
        return;
      }
    }
    if (!isCurrent() || !entry.detail) return;

    entry.detail.root.visible = true;
    this.updateExplode(0);
    this.frameGroup(group, false);
    this.cb.onDetailState(group.id, 'ready');
  }

  expandGroup(): boolean {
    const entry = this.selected ? this.groups.get(this.selected) : undefined;
    if (this.disposed || this.mode !== 'isolated' || !entry?.detail?.root.visible) return false;
    this.mode = 'exploded';
    entry.detail.overlay.visible = false;
    this.showTooltip(null);
    this.buildCallouts(entry.group, this.selectedEntries);
    this.frameGroup(entry.group, true);
    this.updateExplode(0);
    return true;
  }

  private async buildDetail(group: ManifestGroup): Promise<NonNullable<GroupEntry['detail']>> {
    const gltf = await this.loader.loadAsync(assetUrl(group.glb));
    if (this.disposed) {
      this.disposeObject(gltf.scene);
      throw new Error('The model viewer was closed.');
    }
    const root = new THREE.Group();
    root.name = `detail:${group.id}`;
    root.rotation.x = Math.PI / 2;
    const byName = new Map(group.parts.map(p => [p.name, p]));
    const parts: PartNode[] = [];
    const meshesByPart = new Map<string, THREE.Mesh[]>();
    const pickMeshes: THREE.Mesh[] = [];
    gltf.scene.traverse(node => {
      const part = byName.get(node.name);
      if (part) parts.push({ node, base: node.position.clone(), explode: v(part.explode).multiplyScalar(EXPLODE_SCALE) });
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        this.tuneMaterial(mesh);
        let owner: THREE.Object3D | null = node;
        while (owner && !byName.has(owner.name)) owner = owner.parent;
        if (owner) {
          mesh.userData.partName = owner.name;
          const list = meshesByPart.get(owner.name) ?? [];
          list.push(mesh);
          meshesByPart.set(owner.name, list);
        }
        pickMeshes.push(mesh);
      }
    });
    const overlay = this.makeOverlay(gltf.scene);
    root.add(gltf.scene, overlay);
    root.visible = false;
    this.scene.add(root);
    return { root, overlay, parts, meshesByPart, pickMeshes };
  }

  private buildCallouts(group: ManifestGroup, entries: IndexEntry[]): void {
    this.clearCallouts();
    this.calloutCenter.set(0, 0, 0);
    this.calloutCenterOffset.set(0, 0, 0);
    const byName = new Map(group.parts.map(part => [part.name, part]));
    for (const e of entries) {
      const anchor = new THREE.Vector3();
      for (const member of e.members) {
        const part = byName.get(member);
        if (part) anchor.add(v(part.center));
      }
      anchor.divideScalar(e.members.length);
      const offset = v(e.anchor).sub(anchor).multiplyScalar(EXPLODE_SCALE);
      this.calloutCenter.add(anchor);
      this.calloutCenterOffset.add(offset);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'robot-callout';
      el.textContent = String(e.number);
      el.setAttribute('aria-label', `Part ${e.number}: ${e.label}`);
      el.dataset.entryKey = e.key;
      el.dataset.groupId = group.id;
      el.addEventListener('click', () => {
        if (this.selected === group.id) this.cb.onPickEntry(group.id, e.key);
      });
      el.style.zIndex = '1';
      const connector = document.createElement('div');
      connector.setAttribute('aria-hidden', 'true');
      Object.assign(connector.style, {
        position: 'absolute', left: '0', top: '0', height: '1px',
        background: '#20372c', opacity: '0.7', transformOrigin: '0 0',
        pointerEvents: 'none', zIndex: '0',
      });
      this.labelLayer.append(connector, el);
      this.callouts.set(e.key, { el, connector, anchor, offset });
    }
    if (entries.length) {
      this.calloutCenter.divideScalar(entries.length);
      this.calloutCenterOffset.divideScalar(entries.length);
    }
  }

  private clearCallouts(): void {
    for (const { el, connector } of this.callouts.values()) { el.remove(); connector.remove(); }
    this.callouts.clear();
  }

  highlightEntry(key: string | null): void {
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    const members = key
      ? new Set(this.selectedEntries.find(e => e.key === key)?.members ?? [])
      : null;
    for (const [name, meshes] of detail.meshesByPart) {
      const on = members ? members.has(name) : false;
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(on ? SELECTION_BLUE : 0x000000);
        mat.emissiveIntensity = on ? 0.55 : 1;
      }
    }
    for (const [k, c] of this.callouts) {
      c.el.classList.toggle('is-active', k === key);
      c.el.setAttribute('aria-pressed', String(k === key));
      c.connector.style.background = k === key ? '#2f6df6' : '#20372c';
      c.connector.style.opacity = k === key ? '1' : '0.7';
      c.connector.style.height = k === key ? '2px' : '1px';
    }
  }

  focusEntry(key: string): void {
    const entry = this.selectedEntries.find(e => e.key === key);
    const group = this.selected ? this.groups.get(this.selected)?.group : undefined;
    if (this.mode !== 'exploded' || !entry || !group) return;
    this.highlightEntry(key);
    // Fit the actual members rather than guessing size from quantity: a single
    // case lid can be larger than hundreds of repeated electronic components.
    const members = new Set(entry.members);
    const box = new THREE.Box3();
    for (const part of group.parts) {
      if (!members.has(part.name)) continue;
      const center = v(part.center).addScaledVector(v(part.explode), EXPLODE_SCALE);
      const half = v(part.bbox).multiplyScalar(0.5);
      box.expandByPoint(center.clone().sub(half));
      box.expandByPoint(center.clone().add(half));
    }
    if (box.isEmpty()) return;
    const target = box.getCenter(new THREE.Vector3());
    const radius = Math.max(20, box.getSize(new THREE.Vector3()).length() * 0.5);
    this.fit(target, radius, true);
  }

  reset(): void {
    this.selectionVersion += 1;
    this.pendingSelection = null;
    this.highlightEntry(null);
    this.showTooltip(null);
    this.mode = 'overview';
    this.selected = null;
    this.selectedEntries = [];
    this.clearCallouts();
    for (const g of this.groups.values()) {
      g.root.visible = true;
      if (g.detail) {
        g.detail.root.visible = false;
        g.detail.overlay.visible = false;
      }
      g.label.style.display = '';
      g.connector.style.display = '';
    }
    this.setHover(null);
    this.explodeT = 0;
    this.frameOverview();
  }

  setHover(id: string | null): void {
    if (this.mode !== 'overview') id = null;
    if (id === this.hovered) return;
    this.hovered = id;
    for (const g of this.groups.values()) {
      g.overlay.visible = g.group.id === id;
      g.label.classList.toggle('is-hovered', g.group.id === id);
    }
    this.host.style.cursor = id ? 'pointer' : 'default';
    this.cb.onHoverGroup(id);
  }

  private frameOverview(): void {
    if (!this.manifest) return;
    const min = v(this.manifest.envelope.min);
    const max = v(this.manifest.envelope.max);
    this.fit(min.add(max).multiplyScalar(0.5), null, false);
  }

  private frameGroup(group: ManifestGroup, exploded: boolean): void {
    const box = new THREE.Box3();
    for (const part of group.parts) {
      const centre = v(part.center);
      if (exploded) centre.addScaledVector(v(part.explode), EXPLODE_SCALE);
      const half = v(part.bbox).multiplyScalar(0.5);
      box.expandByPoint(centre.clone().sub(half));
      box.expandByPoint(centre.clone().add(half));
    }
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const radius = 0.5 * extent.length();
    this.fit(center, radius, true);
  }

  private fit(target: THREE.Vector3, radius: number | null, iso: boolean): void {
    const dir = (iso ? new THREE.Vector3(1, -1.2, 0.8) : new THREE.Vector3(1.1, -1, 0.55)).normalize();
    this.lastFit = { target: target.clone(), radius, iso };
    const verticalHalfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * this.camera.aspect);
    const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    const distance = radius === null
      ? this.overviewFitDistance(target, dir, Math.tan(verticalHalfFov))
      : radius / Math.sin(limitingHalfFov) * 1.12;
    const dist = Math.max(45, distance);
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.controls.target.copy(target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private overviewFitDistance(target: THREE.Vector3, direction: THREE.Vector3, verticalSlope: number): number {
    const sinElevation = direction.z;
    const cosElevation = Math.hypot(direction.x, direction.y);
    const inverseVertical = 1 / (0.9 * verticalSlope);
    const inverseHorizontal = inverseVertical / this.camera.aspect;
    let distance = 0;
    for (const group of this.manifest?.groups ?? []) {
      for (const part of group.parts) {
        const [x, y, z] = part.center;
        const [width, depth, height] = part.bbox;
        const radial = Math.hypot(Math.abs(x - target.x) + width / 2, Math.abs(y - target.y) + depth / 2);
        for (const edge of [z - target.z - height / 2, z - target.z + height / 2]) {
          // Each part's horizontal radius bounds its projection at every
          // azimuth. Check the side, top, and bottom planes of the frustum.
          distance = Math.max(
            distance,
            edge * sinElevation + radial * Math.hypot(cosElevation, inverseHorizontal),
            edge * (sinElevation + cosElevation * inverseVertical) + radial * Math.abs(cosElevation - sinElevation * inverseVertical),
            edge * (sinElevation - cosElevation * inverseVertical) + radial * Math.abs(cosElevation + sinElevation * inverseVertical),
          );
        }
      }
    }
    return distance;
  }

  private readonly handleResize = (): void => {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    const ratio = Math.min(window.devicePixelRatio, 1.5);
    const sizeChanged = w !== this.cssWidth || h !== this.cssHeight;
    if (ratio !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(ratio);
    if (!sizeChanged) return;
    this.cssWidth = w;
    this.cssHeight = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.lastFit) {
      const { target, radius, iso } = this.lastFit;
      this.fit(target, radius, iso);
    }
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerInside = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  };

  private readonly handlePointerLeave = (): void => {
    this.pointerInside = false;
    this.showTooltip(null);
    if (this.mode === 'overview') this.setHover(null);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.renderer.domElement.focus({ preventScroll: true });
    this.pressInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const press = this.pressInfo;
    this.pressInfo = null;
    if (!press || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > 6 || performance.now() - press.time > 500) return; // a drag, not a click
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.mode === 'overview') {
      const meshes = [...this.groups.values()].flatMap(g => g.root.visible ? g.pickMeshes : []);
      const hit = this.raycaster.intersectObjects(meshes, false)[0];
      const id = hit?.object.userData.groupId as string | undefined;
      if (id) this.cb.onPickGroup(id);
      return;
    }
    const groupId = this.selected;
    const detail = groupId ? this.groups.get(groupId)?.detail : undefined;
    if (!groupId || !detail?.root.visible) return;
    const hit = this.raycaster.intersectObjects(detail.pickMeshes, false)[0];
    if (this.mode === 'isolated') {
      if (hit) this.cb.onExpand();
      return;
    }
    const name = hit?.object.userData.partName as string | undefined;
    if (!name) return;
    const key = this.selectedEntries.find(e => e.members.includes(name))?.key;
    if (key) this.cb.onPickEntry(groupId, key);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (event.altKey || event.ctrlKey || event.metaKey || !CAMERA_KEYS.includes(key)) return;
    event.preventDefault();
    this.keys.add(key);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly clearKeys = (): void => { this.keys.clear(); };

  private applyKeys(dt: number): void {
    if (!this.keys.size) return;
    const target = this.controls.target;
    const pan = this.camera.position.distanceTo(target) * 0.9 * dt;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const move = new THREE.Vector3();
    if (this.keys.has('a') || this.keys.has('arrowleft')) move.addScaledVector(right, -pan);
    if (this.keys.has('d') || this.keys.has('arrowright')) move.addScaledVector(right, pan);
    if (this.keys.has('w') || this.keys.has('arrowup')) move.addScaledVector(up, pan);
    if (this.keys.has('s') || this.keys.has('arrowdown')) move.addScaledVector(up, -pan);
    this.camera.position.add(move);
    target.add(move);
    this.lastFit?.target.add(move);
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.selectionVersion += 1;
    this.pendingSelection = null;
    this.cb.onContextLost('The 3D graphics context was lost. Reload to continue.');
  };

  private updateHover(): void {
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!this.pointerInside || this.dragging) {
      if (this.dragging) this.setHover(null);
      if (detail) detail.overlay.visible = false;
      if (this.mode !== 'overview') this.host.style.cursor = 'default';
      this.showTooltip(null);
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.mode === 'overview') {
      const meshes = [...this.groups.values()].flatMap(g => g.root.visible ? g.pickMeshes : []);
      const hit = this.raycaster.intersectObjects(meshes, false)[0];
      const groupId = (hit?.object.userData.groupId as string | undefined) ?? null;
      this.setHover(groupId);
      this.showTooltip(groupId ? 'Click to isolate' : null);
    } else {
      const hit = detail?.root.visible ? this.raycaster.intersectObjects(detail.pickMeshes, false)[0] : undefined;
      const canExpand = this.mode === 'isolated' && !!hit;
      if (detail) detail.overlay.visible = canExpand;
      this.host.style.cursor = hit ? 'pointer' : 'default';
      this.showTooltip(canExpand ? 'Click to expand' : null);
    }
  }

  private showTooltip(message: string | null): void {
    this.tooltip.hidden = !message;
    if (!message) return;
    if (this.tooltip.textContent !== message) this.tooltip.textContent = message;
    const x = (this.pointer.x + 1) * this.cssWidth / 2 + 16;
    const y = (1 - this.pointer.y) * this.cssHeight / 2 + 16;
    const left = Math.max(4, Math.min(x, this.cssWidth - this.tooltip.offsetWidth - 4));
    const top = Math.max(4, Math.min(y, this.cssHeight - this.tooltip.offsetHeight - 4));
    this.tooltip.style.transform = `translate(${left}px,${top}px)`;
  }

  private updateExplode(dt: number): void {
    const target = this.mode === 'exploded' ? 1 : 0;
    const k = this.reduced ? 1 : Math.min(1, dt * EXPAND_RATE);
    if (Math.abs(this.explodeT - target) < 0.002) this.explodeT = target;
    else this.explodeT = THREE.MathUtils.lerp(this.explodeT, target, k);
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    for (const { node, base, explode } of detail.parts) {
      node.position.copy(base).addScaledVector(explode, this.explodeT);
    }
  }

  private updateLabels(): void {
    const rect = this.renderer.domElement;
    const w = rect.clientWidth;
    const h = rect.clientHeight;
    const project = (point: THREE.Vector3): { x: number; y: number; visible: boolean } => {
      const p = point.clone().project(this.camera);
      return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z >= -1 && p.z <= 1 };
    };
    if (!w || !h) return;
    if (this.mode === 'overview') {
      // Separate the six labels in screen space as the camera orbits. Keep a
      // leader to each projected subsystem centre so displaced labels remain
      // visibly anchored to their geometry.
      const margin = 8;
      const bottom = Math.max(margin, h - 44); // leave the gesture hint clear
      const labels = [...this.groups.values()].map(g => {
        const point = project(v(g.group.center));
        const width = g.label.offsetWidth;
        const height = g.label.offsetHeight;
        return { g, point, width, height, top: point.y - height * 1.2 };
      }).sort((a, b) => a.point.y - b.point.y);
      let nextTop = margin;
      for (const label of labels) {
        label.top = Math.max(nextTop, Math.min(label.top, bottom - label.height));
        nextTop = label.top + label.height + 6;
      }
      let nextBottom = bottom;
      for (let i = labels.length - 1; i >= 0; i -= 1) {
        const label = labels[i];
        label.top = Math.min(label.top, nextBottom - label.height);
        nextBottom = label.top - 6;
      }
      for (const { g, point, width, height, top } of labels) {
        const x = THREE.MathUtils.clamp(point.x, width / 2 + margin, w - width / 2 - margin);
        const y = Math.max(margin, top) + height / 2;
        g.label.style.transform = `translate(${x - width / 2}px,${y - height / 2}px)`;
        g.label.style.visibility = point.visible ? 'visible' : 'hidden';
        const dx = x - point.x;
        const dy = y - point.y;
        g.connector.style.width = `${Math.hypot(dx, dy)}px`;
        g.connector.style.transform = `translate(${point.x}px,${point.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
        g.connector.style.visibility = point.visible ? 'visible' : 'hidden';
      }
    } else if (this.mode === 'exploded') {
      // Dense electronics can share the same projected anchor. Assign each
      // number an outward position in stable index order. The grid keeps
      // buttons disjoint and leaves the bottom hint clear.
      const center = project(this.calloutCenter.clone().addScaledVector(this.calloutCenterOffset, this.explodeT));
      const slots: { x: number; y: number; occupied: boolean }[] = [];
      const spacing = 28;
      const inset = 19;
      const columns = Math.max(1, Math.floor((w - inset * 2) / spacing) + 1);
      const rows = Math.max(1, Math.floor((h - 64 - inset) / spacing) + 1);
      const left = (w - (columns - 1) * spacing) / 2;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          slots.push({ x: left + column * spacing, y: inset + row * spacing, occupied: false });
        }
      }
      for (const { el, connector, anchor, offset } of this.callouts.values()) {
        const point = project(anchor.clone().addScaledVector(offset, this.explodeT));
        const outwardX = point.x - center.x;
        const outwardY = point.y - center.y;
        const spread = 54 / (Math.hypot(outwardX, outwardY) || 1);
        const preferredX = point.x + outwardX * spread;
        const preferredY = point.y + outwardY * spread;
        const onScreen = point.visible && point.x >= 0 && point.x <= w
          && point.y >= 0 && point.y <= h;
        let nearest: typeof slots[number] | undefined;
        let distance = Infinity;
        if (onScreen) {
          for (const slot of slots) {
            if (slot.occupied) continue;
            const squared = (slot.x - preferredX) ** 2 + (slot.y - preferredY) ** 2;
            if (squared < distance) { distance = squared; nearest = slot; }
          }
        }
        el.style.visibility = nearest ? 'visible' : 'hidden';
        connector.style.visibility = nearest ? 'visible' : 'hidden';
        if (!nearest) continue;
        nearest.occupied = true;
        el.style.transform = `translate(-50%,-50%) translate(${nearest.x}px,${nearest.y}px)`;
        const dx = nearest.x - point.x;
        const dy = nearest.y - point.y;
        connector.style.width = `${Math.max(0, Math.hypot(dx, dy) - 12)}px`;
        connector.style.transform = `translate(${point.x}px,${point.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
      }
    }
  }

  private lastTime = performance.now();
  private readonly loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.handleResize();
    const spin = this.autoOrbit && this.mode === 'overview'
      && !this.dragging && !this.pointerInside && !this.hovered && !this.keys.size;
    this.controls.autoRotate = spin;

    this.applyKeys(dt);
    this.updateExplode(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateHover();
    this.updateLabels();
  };

  dispose(): void {
    this.disposed = true;
    this.selectionVersion += 1;
    this.pendingSelection = null;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.handleResize);
    this.clearCallouts();
    this.tooltip.remove();
    for (const g of this.groups.values()) { g.label.remove(); g.connector.remove(); }
    this.disposeObject(this.scene);
    this.overlayMaterial.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.groups.clear();
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      }
    });
  }

  /** True once every overview group is in the scene. */
  get ready(): boolean {
    return this.overviewReady && !this.disposed;
  }
}
