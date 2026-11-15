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

const OVERLAY_BLUE = 0x2f6df6;

export interface RobotSceneCallbacks {
  onHoverGroup(id: string | null): void;
  onPickGroup(id: string): void;
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
  overlay: THREE.Object3D; // translucent blue clone, toggled on hover
  pickMeshes: THREE.Mesh[];
  detail?: {
    root: THREE.Group;
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

  private manifest: RobotManifest | null = null;
  private overviewReady = false;
  private pendingSelection: { group: ManifestGroup; entries: IndexEntry[] } | null = null;
  private selectionVersion = 0;
  private cssWidth = 0;
  private cssHeight = 0;
  private lastFit: { target: THREE.Vector3; radius: number; iso: boolean } | null = null;
  private groups = new Map<string, GroupEntry>();
  private mode: 'overview' | 'exploded' = 'overview';
  private selected: string | null = null;
  private selectedEntries: IndexEntry[] = [];
  private callouts = new Map<string, {
    el: HTMLButtonElement;
    connector: HTMLDivElement;
    anchor: THREE.Vector3;
  }>();
  private highlightKey: string | null = null;

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
      color: OVERLAY_BLUE,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
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

      // Translucent blue overlay clone — a real second pass, toggled on hover.
      const overlay = gltf.scene.clone(true);
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
    if (pending) void this.explodeGroup(pending.group, pending.entries);
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

  async explodeGroup(group: ManifestGroup, entries: IndexEntry[]): Promise<void> {
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
    this.mode = 'exploded';
    this.selected = group.id;
    this.selectedEntries = entries;
    this.setHover(null);

    // Every previous view is hidden immediately, including a cached detail view.
    for (const g of this.groups.values()) {
      g.root.visible = false;
      g.overlay.visible = false;
      if (g.detail) g.detail.root.visible = false;
      g.label.style.display = 'none';
      g.connector.style.display = 'none';
    }

    const isCurrent = () => !this.disposed && this.mode === 'exploded'
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
    this.explodeT = this.reduced ? 1 : 0;
    this.buildCallouts(group.id, entries);
    this.frameExploded(group);
    this.highlightEntry(this.highlightKey);
    this.cb.onDetailState(group.id, 'ready');
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
      if (part) parts.push({ node, base: node.position.clone(), explode: v(part.explode) });
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
    root.visible = false;
    this.scene.add(root);
    return { root, parts, meshesByPart, pickMeshes };
  }

  private buildCallouts(groupId: string, entries: IndexEntry[]): void {
    this.clearCallouts();
    for (const e of entries) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'robot-callout';
      el.textContent = String(e.number);
      el.setAttribute('aria-label', `Part ${e.number}: ${e.label}`);
      el.dataset.entryKey = e.key;
      el.dataset.groupId = groupId;
      el.addEventListener('click', () => {
        if (this.selected === groupId) this.cb.onPickEntry(groupId, e.key);
      });
      el.style.zIndex = '1';
      const connector = document.createElement('div');
      connector.setAttribute('aria-hidden', 'true');
      Object.assign(connector.style, {
        position: 'absolute', left: '0', top: '0', height: '1px',
        background: '#547363', opacity: '0.45', transformOrigin: '0 0',
        pointerEvents: 'none', zIndex: '0',
      });
      this.labelLayer.append(connector, el);
      this.callouts.set(e.key, { el, connector, anchor: v(e.anchor) });
    }
  }

  private clearCallouts(): void {
    for (const { el, connector } of this.callouts.values()) { el.remove(); connector.remove(); }
    this.callouts.clear();
  }

  highlightEntry(key: string | null): void {
    this.highlightKey = key;
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    const members = key
      ? new Set(this.selectedEntries.find(e => e.key === key)?.members ?? [])
      : null;
    for (const [name, meshes] of detail.meshesByPart) {
      const on = members ? members.has(name) : false;
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(on ? OVERLAY_BLUE : 0x000000);
        mat.emissiveIntensity = on ? 0.55 : 1;
      }
    }
    for (const [k, c] of this.callouts) {
      c.el.classList.toggle('is-active', k === key);
      c.el.setAttribute('aria-pressed', String(k === key));
      c.connector.style.background = k === key ? '#2f6df6' : '#547363';
      c.connector.style.opacity = k === key ? '1' : '0.45';
      c.connector.style.height = k === key ? '2px' : '1px';
    }
  }

  focusEntry(key: string): void {
    const entry = this.selectedEntries.find(e => e.key === key);
    const group = this.selected ? this.groups.get(this.selected)?.group : undefined;
    if (!entry || !group) return;
    this.highlightEntry(key);
    // Fit the actual members rather than guessing size from quantity: a single
    // case lid can be larger than hundreds of repeated electronic components.
    const members = new Set(entry.members);
    const box = new THREE.Box3();
    for (const part of group.parts) {
      if (!members.has(part.name)) continue;
      const center = v(part.center).add(v(part.explode));
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
    this.mode = 'overview';
    const previous = this.selected;
    this.selected = null;
    this.selectedEntries = [];
    this.highlightKey = null;
    this.clearCallouts();
    if (previous) {
      const prev = this.groups.get(previous);
      if (prev?.detail) {
        prev.detail.root.visible = false;
        for (const meshes of prev.detail.meshesByPart.values()) {
          for (const mesh of meshes) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 1;
          }
        }
      }
    }
    for (const g of this.groups.values()) {
      g.root.visible = true;
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
    const size = max.clone().sub(min);
    // A sphere encloses the entire envelope for every auto-orbit angle.
    const radius = 0.5 * size.length();
    this.fit(min.add(max).multiplyScalar(0.5), radius, false);
  }

  private frameExploded(group: ManifestGroup): void {
    const box = new THREE.Box3();
    for (const part of group.parts) {
      const centre = v(part.center).add(v(part.explode));
      const half = v(part.bbox).multiplyScalar(0.5);
      box.expandByPoint(centre.clone().sub(half));
      box.expandByPoint(centre.clone().add(half));
    }
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const radius = 0.5 * extent.length();
    this.fit(center, radius, true);
  }

  private fit(target: THREE.Vector3, radius: number, iso: boolean): void {
    const dir = (iso ? new THREE.Vector3(1, -1.2, 0.8) : new THREE.Vector3(1.1, -1, 0.55)).normalize();
    this.lastFit = { target: target.clone(), radius, iso };
    const verticalHalfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * this.camera.aspect);
    const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    const dist = Math.max(45, radius / Math.sin(limitingHalfFov) * 1.12);
    this.camera.position.copy(target).addScaledVector(dir, dist);
    this.controls.target.copy(target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
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
    if (this.mode === 'overview') this.setHover(null);
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pressInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const press = this.pressInfo;
    this.pressInfo = null;
    if (!press) return;
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
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    const hit = this.raycaster.intersectObjects(detail.pickMeshes, false)[0];
    const name = hit?.object.userData.partName as string | undefined;
    if (!name) return;
    const key = this.selectedEntries.find(e => e.members.includes(name))?.key;
    if (key) this.cb.onPickEntry(this.selected!, key);
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.selectionVersion += 1;
    this.pendingSelection = null;
    this.cb.onContextLost('The 3D graphics context was lost. Reload to continue.');
  };

  private updateHover(): void {
    if (this.mode !== 'overview' || !this.pointerInside || this.dragging) {
      if (this.dragging && this.mode === 'overview') this.setHover(null);
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes: THREE.Mesh[] = [];
    for (const g of this.groups.values()) if (g.root.visible) meshes.push(...g.pickMeshes);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    this.setHover((hit?.object.userData.groupId as string | undefined) ?? null);
  }

  private updateExplode(dt: number): void {
    const target = this.mode === 'exploded' ? 1 : 0;
    const k = this.reduced ? 1 : Math.min(1, dt * 7);
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
    } else {
      // Dense electronics can share the same projected anchor. Assign each
      // visible number its nearest free grid position in stable index order,
      // keeping all 22px buttons disjoint and leaving the bottom hint clear.
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
      for (const { el, connector, anchor } of this.callouts.values()) {
        const point = project(anchor);
        const onScreen = point.visible && point.x >= 0 && point.x <= w
          && point.y >= 0 && point.y <= h;
        let nearest: typeof slots[number] | undefined;
        let distance = Infinity;
        if (onScreen) {
          for (const slot of slots) {
            if (slot.occupied) continue;
            const squared = (slot.x - point.x) ** 2 + (slot.y - point.y) ** 2;
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
        connector.style.width = `${Math.max(0, Math.hypot(dx, dy) - 11)}px`;
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
      && !this.dragging && !this.pointerInside && !this.hovered;
    this.controls.autoRotate = spin;

    this.updateHover();
    this.updateExplode(dt);
    this.controls.update();
    this.updateLabels();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    this.selectionVersion += 1;
    this.pendingSelection = null;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.handleResize);
    this.clearCallouts();
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
