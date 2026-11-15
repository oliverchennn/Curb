// Types and loader for the Curb robot concept CAD web manifest.
//
// The manifest and GLB assets are produced from the parametric CadQuery model by
// `export_web.py` (release `curb-robot-cad-e-handoff-2026-11-15`). This is a
// generic prototype concept model — not validated hardware. Descriptions are
// generic envelopes only; no part numbers, ratings or performance claims.

export type Vec3 = [number, number, number];

export interface ManifestPart {
  /** Node name in the group's GLB (unique within the robot). */
  name: string;
  /** Human label, may carry a position prefix (e.g. "RL rotor shell"). */
  label: string;
  /** Family key shared by identical repeated hardware (e.g. "magnet"). */
  kind: string;
  /** Generic, functional description sourced from the BOM. */
  description: string;
  color: string;
  center: Vec3;
  bbox: Vec3;
  /** Per-part radial offset applied in the exploded view. */
  explode: Vec3;
  size: number;
  stage?: number;
  stageLabel?: string;
  solidCount?: number;
}

export interface ManifestGroup {
  id: string;
  label: string;
  color: string;
  blurb: string;
  /** Full-detail GLB path, relative to the manifest (e.g. "models/group_drive.glb"). */
  glb: string;
  /** Decimated preview GLB path used in the overview. */
  preview?: string;
  center: Vec3;
  /** Rigid offset used to separate this group from the robot centre. */
  explode: Vec3;
  bbox?: Vec3;
  count: number;
  parts: ManifestPart[];
}

export interface RobotManifest {
  unit: string;
  robotCenter: Vec3;
  envelope: { min: Vec3; max: Vec3 };
  note: string;
  groups: ManifestGroup[];
}

/** Public base path where the robot assets are served. */
export const ROBOT_ASSET_BASE = '/robot/';

/** Resolve a manifest-relative asset path to a served URL. */
export function assetUrl(relative: string): string {
  return ROBOT_ASSET_BASE + relative.replace(/^\/+/, '');
}

export function isRobotManifest(value: unknown): value is RobotManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return m.unit === 'mm' && Array.isArray(m.groups) && Array.isArray(m.robotCenter);
}

export async function loadManifest(signal?: AbortSignal): Promise<RobotManifest> {
  const response = await fetch(assetUrl('manifest.json'), { signal });
  if (!response.ok) throw new Error(`Model index returned HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!isRobotManifest(data)) throw new Error('The model index has an unsupported format.');
  return data;
}
