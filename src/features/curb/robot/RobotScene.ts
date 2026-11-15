// Imperative three.js scene for the Curb robot explorer.
//
// Plain three.js (no react-three-fiber) so the viewer adds no new dependency.
// Three stages:
//   overview  — the whole robot; hover a group for a mint coating + label, click to isolate.
//   isolated  — only the chosen group, assembled; hover for the coating + "Click to expand".
//   exploded  — that group fanned into its parts, each with a leader-line number callout.
// WASD / arrow keys travel across the plane and move closer / farther at any stage.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { assetUrl, type ManifestGroup, type ManifestPart, type RobotManifest, type Vec3 } from './manifest';
import type { IndexEntry } from './groups';

const OVERLAY_MINT = 0x8ef0e4; // mint-toothpaste blue
const HILITE = 0x2f6df6; // selection highlight
const EXPLODE_SCALE = 0.5; // pull parts apart less than the raw CAD offsets
const EXPAND_RATE = 1.8; // slow expand
const COLLAPSE_RATE = 3.6;
const LEADER_PX = 54; // leader length from the part to its number box
const SVG_NS = 'http://www.w3.org/2000/svg';

export type SceneMode = 'overview' | 'isolated' | 'exploded';

export interface RobotSceneCallbacks {
  onHoverGroup(id: string | null): void;
  onPickGroup(id: string): void;
  onExpand(id: string): void;
  onPickEntry(groupId: string, entryKey: string): void;
  onProgress(loaded: number, total: number): void;
  onDetailState(groupId: string, state: 'loading' | 'ready' | 'error', message?: string): void;
  onContextLost(message: string): void;
}

interface PartNode {
  node: THREE.Object3D;
  base: THREE.Vector3;
  explode: THREE.Vector3; // already scaled by EXPLODE_SCALE
}

interface DetailModel {
  root: THREE.Group;
  overlay: THREE.Object3D;
  parts: PartNode[];
  meshesByPart: Map<string, THREE.Mesh[]>;
  pickMeshes: THREE.Mesh[];
}

interface GroupEntry {
  group: ManifestGroup;
  root: THREE.Group;
  overlay: THREE.Object3D;
  pickMeshes: THREE.Mesh[];
  label: HTMLButtonElement;
  detail?: DetailModel;
}

interface Callout {
  box: HTMLButtonElement;
  line: SVGLineElement;
  anchor: THREE.Vector3;
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
  private readonly leaderSvg: SVGSVGElement;
  private readonly tooltip: HTMLDivElement;

  private manifest: RobotManifest | null = null;
  private groups = new Map<string, GroupEntry>();
  private mode: SceneMode = 'overview';
  private selected: string | null = null;
  private selectedGroup: ManifestGroup | null = null;
  private selectedEntries: IndexEntry[] = [];
  private partByName = new Map<string, ManifestPart>();
  private callouts = new Map<string, Callout>();
  private centroid = new THREE.Vector3();

  private hovered: string | null = null;
  private hoverDetail = false;
  private pointerInside = false;
  private pointerClient = { x: 0, y: 0 };
  private dragging = false;
  private autoOrbit = true;
  private reduced = false;
  private explodeT = 0;
  private explodeTarget = 0;
  private readonly keys = new Set<string>();
  private raf = 0;
  private disposed = false;
  private pressInfo: { x: number; y: number; time: number } | null = null;
  private lastTime = performance.now();

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
    canvas.tabIndex = 0; // focusable for keyboard travel

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
    this.controls.minDistance = 15;
    this.controls.maxDistance = 15000;
    this.controls.addEventListener('start', () => { this.dragging = true; });
    this.controls.addEventListener('end', () => { this.dragging = false; });

    this.overlayMaterial = new THREE.MeshBasicMaterial({
      color: OVERLAY_MINT,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.leaderSvg = document.createElementNS(SVG_NS, 'svg');
    this.leaderSvg.setAttribute('class', 'robot-leaders');
    this.labelLayer.appendChild(this.leaderSvg);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'robot-tip';
    this.tooltip.style.display = 'none';
    this.labelLayer.appendChild(this.tooltip);

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('blur', () => this.keys.clear());
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
      const gltf = await this.loader.loadAsync(assetUrl(group.preview || group.glb));
      const root = new THREE.Group();
      root.rotation.x = Math.PI / 2; // GLB is Y-up; restore manifest CAD (Z-up) coords.
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
      label.addEventListener('click', () => this.cb.onPickGroup(group.id));
      label.addEventListener('pointerenter', () => this.setHover(group.id));
      label.addEventListener('pointerleave', () => this.setHover(null));
      this.labelLayer.appendChild(label);

      this.groups.set(group.id, { group, root, overlay, pickMeshes, label });
      loaded += 1;
      this.cb.onProgress(loaded, total);
    }
    this.frameOverview();
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
        mesh.userData.overlay = true;
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
    this.reduced = reduced;
    this.controls.enableDamping = !reduced;
  }

  setAutoOrbit(enabled: boolean): void {
    this.autoOrbit = enabled;
  }

  /** Stage 1 → 2: isolate a group (strip the rest), shown assembled. */
  async isolateGroup(group: ManifestGroup, entries: IndexEntry[]): Promise<void> {
    const entry = this.groups.get(group.id);
    if (!entry) return;
    this.mode = 'isolated';
    this.selected = group.id;
    this.selectedGroup = group;
    this.selectedEntries = entries;
    this.partByName = new Map(group.parts.map(p => [p.name, p]));
    this.setHover(null);
    this.clearCallouts();
    this.explodeTarget = 0;
    this.explodeT = 0;

    for (const g of this.groups.values()) {
      g.root.visible = false;
      g.overlay.visible = false;
      g.label.style.display = 'none';
      if (g.detail) g.detail.root.visible = false;
    }

    if (!entry.detail) {
      this.cb.onDetailState(group.id, 'loading');
      try {
        entry.detail = await this.buildDetail(group);
        this.cb.onDetailState(group.id, 'ready');
      } catch (err) {
        this.cb.onDetailState(group.id, 'error', err instanceof Error ? err.message : String(err));
        return;
      }
    }
    if (this.disposed || this.selected !== group.id) return;
    entry.detail.root.visible = true;
    this.resetHighlight(entry.detail);
    this.frameGroup(group, false);
  }

  /** Stage 2 → 3: expand the isolated group into its parts (slow). */
  expand(): void {
    if (this.mode !== 'isolated' || !this.selectedGroup) return;
    this.mode = 'exploded';
    this.setHover(null);
    const detail = this.groups.get(this.selectedGroup.id)?.detail;
    if (detail) detail.overlay.visible = false;
    this.explodeTarget = 1;
    if (this.reduced) this.explodeT = 1;
    this.buildCallouts(this.selectedEntries);
    this.frameGroup(this.selectedGroup, true);
  }

  private async buildDetail(group: ManifestGroup): Promise<DetailModel> {
    const gltf = await this.loader.loadAsync(assetUrl(group.glb));
    const root = new THREE.Group();
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
    root.add(gltf.scene);
    const overlay = this.makeOverlay(gltf.scene);
    root.add(overlay);
    root.visible = false;
    this.scene.add(root);
    return { root, overlay, parts, meshesByPart, pickMeshes };
  }

  private scaledAnchor(entry: IndexEntry): THREE.Vector3 {
    const sum = new THREE.Vector3();
    let n = 0;
    for (const name of entry.members) {
      const part = this.partByName.get(name);
      if (!part) continue;
      sum.add(v(part.center)).add(v(part.explode).multiplyScalar(EXPLODE_SCALE));
      n += 1;
    }
    if (n > 0) sum.multiplyScalar(1 / n);
    return sum;
  }

  private buildCallouts(entries: IndexEntry[]): void {
    this.clearCallouts();
    this.centroid.set(0, 0, 0);
    let count = 0;
    for (const entry of entries) {
      const anchor = this.scaledAnchor(entry);
      this.centroid.add(anchor);
      count += 1;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('class', 'robot-leader-line');
      this.leaderSvg.appendChild(line);
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'robot-leader';
      box.textContent = String(entry.number);
      box.setAttribute('aria-label', `Part ${entry.number}: ${entry.label}`);
      box.addEventListener('click', () => this.cb.onPickEntry(this.selected!, entry.key));
      this.labelLayer.appendChild(box);
      this.callouts.set(entry.key, { box, line, anchor });
    }
    if (count > 0) this.centroid.multiplyScalar(1 / count);
  }

  private clearCallouts(): void {
    for (const { box, line } of this.callouts.values()) {
      box.remove();
      line.remove();
    }
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
        mat.emissive.setHex(on ? HILITE : 0x000000);
        mat.emissiveIntensity = on ? 0.5 : 1;
      }
    }
    for (const [k, c] of this.callouts) c.box.classList.toggle('is-active', k === key);
  }

  private resetHighlight(detail: DetailModel): void {
    for (const meshes of detail.meshesByPart.values()) {
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 1;
      }
    }
  }

  focusEntry(key: string): void {
    const entry = this.selectedEntries.find(e => e.key === key);
    if (!entry) return;
    this.highlightEntry(key);
    const anchor = this.scaledAnchor(entry);
    const radius = Math.max(35, 2.2 * Math.cbrt(Math.max(1, entry.quantity)) * 28);
    this.fit(anchor, radius, true);
  }

  reset(): void {
    this.mode = 'overview';
    const previous = this.selected;
    this.selected = null;
    this.selectedGroup = null;
    this.selectedEntries = [];
    this.clearCallouts();
    if (previous) {
      const prev = this.groups.get(previous);
      if (prev?.detail) {
        prev.detail.root.visible = false;
        prev.detail.overlay.visible = false;
        this.resetHighlight(prev.detail);
      }
    }
    for (const g of this.groups.values()) {
      g.root.visible = true;
      g.label.style.display = '';
    }
    this.setHover(null);
    this.explodeTarget = 0;
    this.explodeT = 0;
    this.frameOverview();
  }

  getMode(): SceneMode {
    return this.mode;
  }

  private setHover(id: string | null): void {
    if (this.mode !== 'overview') id = null;
    if (id !== this.hovered) {
      this.hovered = id;
      for (const g of this.groups.values()) {
        g.overlay.visible = g.group.id === id;
        g.label.classList.toggle('is-hovered', g.group.id === id);
      }
      this.cb.onHoverGroup(id);
    }
  }

  private frameOverview(): void {
    if (!this.manifest) return;
    const size = v(this.manifest.envelope.max).sub(v(this.manifest.envelope.min));
    this.fit(v(this.manifest.robotCenter), 0.5 * Math.max(size.x, size.y, size.z), false);
  }

  private frameGroup(group: ManifestGroup, exploded: boolean): void {
    const box = new THREE.Box3();
    for (const part of group.parts) {
      const off = exploded ? v(part.explode).multiplyScalar(EXPLODE_SCALE) : new THREE.Vector3();
      const centre = v(part.center).add(off);
      const half = v(part.bbox).multiplyScalar(0.5);
      box.expandByPoint(centre.clone().sub(half));
      box.expandByPoint(centre.clone().add(half));
    }
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    this.fit(center, 0.5 * Math.max(extent.x, extent.y, extent.z), true);
  }

  private fit(target: THREE.Vector3, radius: number, iso: boolean): void {
    const dir = (iso ? new THREE.Vector3(1, -1.2, 0.8) : new THREE.Vector3(1.1, -1, 0.55)).normalize();
    const dist = Math.max(40, radius * 2.7);
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.controls.target.copy(target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private readonly handleResize = (): void => {
    const w = this.host.clientWidth || 1;
    const h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.leaderSvg.setAttribute('width', String(w));
    this.leaderSvg.setAttribute('height', String(h));
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    this.pointerInside = true;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerClient = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    this.pointer.set(
      (this.pointerClient.x / rect.width) * 2 - 1,
      -(this.pointerClient.y / rect.height) * 2 + 1,
    );
  };

  private readonly handlePointerLeave = (): void => {
    this.pointerInside = false;
    if (this.mode === 'overview') this.setHover(null);
    this.hoverDetail = false;
    this.tooltip.style.display = 'none';
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    (event.target as HTMLElement)?.focus?.();
    this.pressInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const press = this.pressInfo;
    this.pressInfo = null;
    if (!press) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6 || performance.now() - press.time > 500) return;
    if (this.mode === 'overview') {
      if (this.hovered) this.cb.onPickGroup(this.hovered);
      return;
    }
    if (this.mode === 'isolated') {
      if (this.hoverDetail && this.selected) this.cb.onExpand(this.selected);
      return;
    }
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(detail.pickMeshes, false)[0];
    const name = hit?.object.userData.partName as string | undefined;
    if (!name) return;
    const key = this.selectedEntries.find(e => e.members.includes(name))?.key;
    if (key) this.cb.onPickEntry(this.selected!, key);
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.cb.onContextLost('The 3D graphics context was lost. Reload to continue.');
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const k = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      this.keys.add(k);
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private applyKeys(dt: number): void {
    if (this.keys.size === 0) return;
    const target = this.controls.target;
    const dist = this.camera.position.distanceTo(target);
    const pan = dist * 0.9 * dt;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    const move = new THREE.Vector3();
    if (this.keys.has('a') || this.keys.has('arrowleft')) move.addScaledVector(right, -pan);
    if (this.keys.has('d') || this.keys.has('arrowright')) move.addScaledVector(right, pan);
    if (this.keys.has('w') || this.keys.has('arrowup')) move.addScaledVector(up, pan);
    if (this.keys.has('s') || this.keys.has('arrowdown')) move.addScaledVector(up, -pan);
    if (move.lengthSq() > 0) {
      this.camera.position.add(move);
      target.add(move);
      this.controls.update();
    }
  }

  private updateHover(): void {
    if (this.mode === 'overview') {
      if (!this.pointerInside || this.dragging) {
        if (this.dragging) this.setHover(null);
        this.tooltip.style.display = 'none';
        return;
      }
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const meshes: THREE.Mesh[] = [];
      for (const g of this.groups.values()) if (g.root.visible) meshes.push(...g.pickMeshes);
      const hit = this.raycaster.intersectObjects(meshes, false)[0];
      const id = (hit?.object.userData.groupId as string | undefined) ?? null;
      this.setHover(id);
      this.host.style.cursor = id ? 'pointer' : 'default';
      this.showTip(id ? 'Click to isolate' : null);
      return;
    }
    if (this.mode === 'isolated') {
      const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
      let over = false;
      if (detail && this.pointerInside && !this.dragging) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        over = this.raycaster.intersectObjects(detail.pickMeshes, false).length > 0;
      }
      this.hoverDetail = over;
      if (detail) detail.overlay.visible = over;
      this.host.style.cursor = over ? 'pointer' : 'default';
      this.showTip(over ? 'Click to expand' : null);
      return;
    }
    // exploded: pointer feedback only
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    let over = false;
    if (detail && this.pointerInside && !this.dragging) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      over = this.raycaster.intersectObjects(detail.pickMeshes, false).length > 0;
    }
    this.host.style.cursor = over ? 'pointer' : 'default';
    this.tooltip.style.display = 'none';
  }

  private showTip(text: string | null): void {
    if (!text) { this.tooltip.style.display = 'none'; return; }
    this.tooltip.textContent = text;
    this.tooltip.style.display = 'block';
    this.tooltip.style.transform = `translate(${this.pointerClient.x + 16}px, ${this.pointerClient.y + 16}px)`;
  }

  private updateExplode(dt: number): void {
    const rate = this.explodeTarget > this.explodeT ? EXPAND_RATE : COLLAPSE_RATE;
    const k = this.reduced ? 1 : Math.min(1, dt * rate);
    if (Math.abs(this.explodeT - this.explodeTarget) < 0.002) this.explodeT = this.explodeTarget;
    else this.explodeT = THREE.MathUtils.lerp(this.explodeT, this.explodeTarget, k);
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    for (const { node, base, explode } of detail.parts) {
      node.position.copy(base).addScaledVector(explode, this.explodeT);
    }
  }

  private project(point: THREE.Vector3, w: number, h: number): { x: number; y: number; visible: boolean } {
    const p = point.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z < 1 };
  }

  private updateLabels(): void {
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    if (this.mode === 'overview') {
      for (const g of this.groups.values()) {
        const { x, y, visible } = this.project(v(g.group.center), w, h);
        g.label.style.transform = `translate(-50%,-120%) translate(${x}px,${y}px)`;
        g.label.style.visibility = visible ? 'visible' : 'hidden';
      }
      return;
    }
    if (this.mode !== 'exploded' || this.callouts.size === 0) return;
    const c = this.project(this.centroid, w, h);
    for (const { box, line, anchor } of this.callouts.values()) {
      const p = this.project(anchor, w, h);
      if (!p.visible) {
        box.style.visibility = 'hidden';
        line.style.visibility = 'hidden';
        continue;
      }
      let dx = p.x - c.x;
      let dy = p.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const bx = p.x + dx * LEADER_PX;
      const by = p.y + dy * LEADER_PX;
      line.setAttribute('x1', String(p.x));
      line.setAttribute('y1', String(p.y));
      line.setAttribute('x2', String(bx));
      line.setAttribute('y2', String(by));
      line.style.visibility = 'visible';
      box.style.visibility = 'visible';
      box.style.transform = `translate(-50%,-50%) translate(${bx}px,${by}px)`;
    }
  }

  private readonly loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.host.clientWidth && this.renderer.domElement.clientWidth !== this.host.clientWidth) {
      this.handleResize();
    }
    const spin = this.autoOrbit && !this.reduced && this.mode === 'overview'
      && !this.dragging && this.keys.size === 0 && !(this.pointerInside && this.hovered);
    this.controls.autoRotate = spin;

    this.applyKeys(dt);
    this.updateHover();
    this.updateExplode(dt);
    this.controls.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.handleResize);
    this.clearCallouts();
    this.leaderSvg.remove();
    this.tooltip.remove();
    for (const g of this.groups.values()) g.label.remove();
    this.scene.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat?.dispose();
      }
    });
    this.overlayMaterial.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.groups.clear();
  }

  get ready(): boolean {
    return this.groups.size > 0;
  }
}
