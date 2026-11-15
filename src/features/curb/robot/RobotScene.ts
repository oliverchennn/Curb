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
  label: HTMLButtonElement;
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
  private groups = new Map<string, GroupEntry>();
  private mode: 'overview' | 'exploded' = 'overview';
  private selected: string | null = null;
  private selectedEntries: IndexEntry[] = [];
  private callouts = new Map<string, { el: HTMLButtonElement; anchor: THREE.Vector3 }>();
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
      this.labelLayer.appendChild(label);

      this.groups.set(group.id, { group, root, overlay, pickMeshes, label });
      loaded += 1;
      this.cb.onProgress(loaded, total);
    }
    this.frameOverview();
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
    if (reduced) this.explodeT = this.mode === 'exploded' ? 1 : 0;
  }

  setAutoOrbit(enabled: boolean): void {
    this.autoOrbit = enabled;
  }

  async explodeGroup(group: ManifestGroup, entries: IndexEntry[]): Promise<void> {
    const entry = this.groups.get(group.id);
    if (!entry) return;
    this.mode = 'exploded';
    this.selected = group.id;
    this.selectedEntries = entries;
    this.setHover(null);

    // Hide every preview group while one group is isolated.
    for (const g of this.groups.values()) {
      g.root.visible = false;
      g.overlay.visible = false;
      g.label.style.display = 'none';
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
    this.explodeT = this.reduced ? 1 : 0;
    this.buildCallouts(entries);
    this.frameExploded(group, entries);
  }

  private async buildDetail(group: ManifestGroup): Promise<NonNullable<GroupEntry['detail']>> {
    const gltf = await this.loader.loadAsync(assetUrl(group.glb));
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

  private buildCallouts(entries: IndexEntry[]): void {
    this.clearCallouts();
    for (const e of entries) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'robot-callout';
      el.textContent = String(e.number);
      el.setAttribute('aria-label', `Part ${e.number}: ${e.label}`);
      el.addEventListener('click', () => this.cb.onPickEntry(this.selected!, e.key));
      this.labelLayer.appendChild(el);
      this.callouts.set(e.key, { el, anchor: v(e.anchor) });
    }
  }

  private clearCallouts(): void {
    for (const { el } of this.callouts.values()) el.remove();
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
    }
  }

  focusEntry(key: string): void {
    const entry = this.selectedEntries.find(e => e.key === key);
    if (!entry) return;
    this.highlightEntry(key);
    // The group root rotation restores manifest CAD coordinates, so anchors are
    // used directly (no extra rotation).
    const anchor = v(entry.anchor);
    const radius = Math.max(40, 2.4 * Math.cbrt(Math.max(1, entry.quantity)) * 30);
    this.fit(anchor, radius, true);
  }

  reset(): void {
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
    }
    this.setHover(null);
    this.explodeT = 0;
    this.frameOverview();
  }

  private setHover(id: string | null): void {
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
    const radius = 0.5 * Math.max(size.x, size.y, size.z);
    this.fit(v(this.manifest.robotCenter), radius, false);
  }

  private frameExploded(group: ManifestGroup, entries: IndexEntry[]): void {
    const box = new THREE.Box3();
    for (const part of group.parts) {
      const centre = v(part.center).add(v(part.explode));
      const half = v(part.bbox).multiplyScalar(0.5);
      box.expandByPoint(centre.clone().sub(half));
      box.expandByPoint(centre.clone().add(half));
    }
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const radius = 0.5 * Math.max(extent.x, extent.y, extent.z);
    void entries;
    this.fit(center, radius, true);
  }

  private fit(target: THREE.Vector3, radius: number, iso: boolean): void {
    const dir = (iso ? new THREE.Vector3(1, -1.2, 0.8) : new THREE.Vector3(1.1, -1, 0.55)).normalize();
    const dist = Math.max(45, radius * 2.8);
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
    if (this.mode === 'overview') {
      if (this.hovered) this.cb.onPickGroup(this.hovered);
      return;
    }
    const detail = this.selected ? this.groups.get(this.selected)?.detail : undefined;
    if (!detail) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
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
      return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z < 1 };
    };
    if (this.mode === 'overview') {
      for (const g of this.groups.values()) {
        const { x, y, visible } = project(v(g.group.center));
        g.label.style.transform = `translate(-50%,-120%) translate(${x}px,${y}px)`;
        g.label.style.visibility = visible ? 'visible' : 'hidden';
      }
    } else {
      for (const { el, anchor } of this.callouts.values()) {
        const { x, y, visible } = project(anchor);
        el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
        el.style.visibility = visible ? 'visible' : 'hidden';
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

    if (this.host.clientWidth && this.renderer.domElement.width !== this.host.clientWidth) {
      this.handleResize();
    }
    const spin = this.autoOrbit && !this.reduced && this.mode === 'overview'
      && !this.dragging && !(this.pointerInside && this.hovered);
    this.controls.autoRotate = spin;

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

  /** True once the first overview group is in the scene. */
  get ready(): boolean {
    return this.groups.size > 0;
  }
}
