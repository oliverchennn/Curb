"""
Export the Curb model for the interactive web explorer:
  web/public/models/group_<id>.glb   - one GLB per functional group (parts named by node)
  web/public/manifest.json           - groups + parts with colours, centroids, explode offsets

Group explode = radial separation of each group from the robot centre (for the "expand" state).
Part explode  = radial fan of each part from its group centre (for the "explode a group" state).

Run:  .venv/Scripts/python export_web.py
Generic prototype model - not validated hardware.
"""

import json
import hashlib
import math
import os

import cadquery as cq

import curb_robot as cr
from build_identity import source_identity
from display_layout import part_offset

WEB = os.path.join(cr.HERE, "web", "public")
MODELS = os.path.join(WEB, "models")

# functional groups (kinds -> group); mirrors the film's subsystems
GROUPS = [
    ("structure", "Chassis & enclosure", "#2E6B4F", "Shell, mounts and service mechanisms",
     {"tub", "top_plate", "body", "lid", "seam", "rim_carrier", "bumper", "bumper_foam", "bumper_bracket",
      "bumper_screw", "bumper_nut", "trim", "hinge",
      "hinge_pin", "hinge_screw", "latch", "latch_paddle", "latch_pin", "latch_striker", "latch_lock", "wordmark",
      "bolt", "panel_bolt", "panel_nut", "tub_rib", "strut_body", "strut_rod", "strut_eye", "flange_gasket",
      "flange_nut"}),
    ("drive", "Drive & mobility", "#B5651D", "Moves the robot along the sidewalk",
     {"rotor_shell", "rotor_cover", "rotor_screw", "magnet", "stator_core", "stator_coil", "stator_carrier",
      "hall_board", "hall_sensor", "bearing_ring", "bearing_ball", "shaft_seal", "circlip", "axle_shaft",
      "motor_pigtail", "axle_washer", "axle_nut", "tire", "lug", "hub_cover", "cap_nut", "axle_bracket",
      "bracket_screw", "bracket_nut", "drv_tray", "drv_lid", "drv_pcb", "drv_fet", "drv_thermal", "drv_cap",
      "drv_ic", "drv_smd", "drv_conn", "drv_standoff", "drv_screw"}),
    ("power", "Power & safety", "#C8102E", "Stores, distributes and cuts power",
     {"bat_case", "bat_cell", "bat_cell_term", "bat_holder", "bat_strip", "bat_bms", "bat_harness", "bat_sensor",
      "bat_terminal", "bat_vent", "bat_lead", "holddown", "pdu_case", "pdu_contactor", "pdu_dcdc", "pdu_fuseblock",
      "pdu_busbar", "pdu_terminal", "pdu_led", "pdu_screw", "fuse_holder", "fuse_cartridge", "charge_inlet",
      "isolator", "estop_body", "estop_collar", "estop_head", "estop_contact", "estop_screw", "estop_lead",
      "lb_housing", "lb_board", "lb_lens"}),
    ("sensing", "Sensing", "#367A83", "Captures forward, surface and curb-side imagery",
     {"cam_housing", "cam_gasket", "cam_bezel", "cam_window", "cam_int_seal", "cam_int_lens", "cam_int_optic",
      "cam_int_ic", "cam_int_pcb", "cam_int_smd", "cam_int_conn", "cam_int_standoff", "cam_int_thermal",
      "cam_int_desiccant", "cam_vent", "cam_gland", "cam_int_gland", "cam_int_cable", "cam_int_insert", "cam_screw",
      "mast", "flange", "mount_clamp", "bracket"}),
    ("compute", "Compute, comms & cooling", "#5A4FCF", "Computing, communication and cooling layout",
     {"cmp_case", "cmp_pcb", "cmp_soc", "cmp_soc_hs", "cmp_ic", "cmp_modem", "cmp_gnss", "cmp_imu", "cmp_conn",
      "cmp_standoff", "cmp_screw", "fan_frame", "fan_rotor", "fan_blade", "fan_guard", "fan_screw", "ant_base",
      "ant_mount", "ant_radome", "ant_element", "ant_coax", "antenna", "vent_filter", "vent_mesh"}),
    ("wiring", "Wiring harness", "#4A4A4A", "Connects power, motors, cameras and controls",
     {"cable", "harness_grommet", "harness_clip"}),
]
KIND2GROUP = {}
for gid, _, _, _, kinds in GROUPS:
    for k in kinds:
        KIND2GROUP[k] = gid


def humanize(name, kind):
    base = name
    for pre in ("wheel_", "motor_driver_", "camera01_", "camera02_", "camera03_", "battery_", "pdu_", "compute_",
                "fan_", "antenna_", "lightbar_front_", "lightbar_rear_", "lid_hinge_", "mainfuse_", "charge_inlet_",
                "isolator_", "estop_", "gas_strut_", "vent_", "mast_", "top_plate_", "body_down_", "tub_"):
        if base.startswith(pre):
            base = base[len(pre):]
            break
    base = base.replace("_", " ").strip()
    base = " ".join(w for w in base.split() if not (w.isdigit() or (len(w) <= 3 and w[0].isdigit())))
    return base or kind.replace("_", " ")


PREVIEW_KINDS = {
    "tub", "top_plate", "body", "lid", "seam", "rim_carrier", "bumper", "trim", "wordmark", "hinge", "latch", "latch_paddle",
    "latch_lock", "tire", "lug", "rotor_shell", "rotor_cover", "hub_cover", "cap_nut", "axle_bracket", "drv_lid", "drv_tray", "bat_case",
    "pdu_case", "charge_inlet", "isolator", "estop_head", "estop_collar", "lb_housing", "lb_lens",
    "cam_housing", "cam_bezel", "cam_window", "cam_gland", "mast", "flange", "mount_clamp", "bracket",
    "cmp_case", "fan_frame", "fan_guard", "antenna", "vent_filter", "vent_mesh", "cable", "harness_clip",
}


def unit_id(name, group):
    for prefix in ("wheel_RL", "wheel_RR", "wheel_ML", "wheel_MR", "wheel_FL", "wheel_FR",
                   "camera01", "camera02", "camera03", "motor_driver_L", "motor_driver_R", "battery",
                   "lightbar_front", "lightbar_rear", "pdu", "compute", "fan", "charge_inlet", "isolator",
                   "estop", "mainfuse", "lid_hinge_L", "lid_hinge_R", "gas_strut_L", "latch", "mast"):
        if name.startswith(prefix+"_"):
            return prefix
    return group


def main():
    os.makedirs(MODELS, exist_ok=True)
    identity = source_identity()
    parts, _ = cr.build()
    # assign groups
    byg = {gid: [] for gid, *_ in GROUPS}
    allbb = cq.Compound.makeCompound([v[0] for v in parts.values()]).BoundingBox()
    rc = (40.0, 0.0, (allbb.zmin + allbb.zmax) / 2)
    for name, (shape, col, kind, step) in parts.items():
        gid = KIND2GROUP.get(kind)
        if gid is None:
            raise KeyError(f"no group for kind {kind} ({name})")
        byg[gid].append((name, shape, col, kind))

    manifest = {"unit": "mm", "robotCenter": rc, "source": identity,
                "envelope": {"min": [allbb.xmin, allbb.ymin, allbb.zmin],
                             "max": [allbb.xmax, allbb.ymax, allbb.zmax]},
                "note": "Generic prototype concept model - not validated hardware.", "groups": []}

    # group centres + explode directions
    gcen = {}
    for gid, label, color, blurb, _ in GROUPS:
        gp = byg[gid]
        gb = cq.Compound.makeCompound([s for _, s, _, _ in gp]).BoundingBox()
        gcen[gid] = (gb.center.x, gb.center.y, gb.center.z)

    for gid, label, color, blurb, _ in GROUPS:
        gp = byg[gid]
        gc = gcen[gid]
        # Fixed inspection bays keep all six rigid clusters visibly separate.
        # Offsets are shared with the showcase animation through the manifest.
        bays = {"structure": (-1000, -700, 450), "drive": (0, -700, 200),
                "power": (1000, -700, 350), "sensing": (-1000, 700, 500),
                "compute": (0, 700, 450), "wiring": (1000, 700, 450)}
        gexp = [bays[gid][i] - gc[i] for i in range(3)]

        unit_centres = {}
        for unit in {unit_id(n, gid) for n, *_ in gp}:
            ub = cq.Compound.makeCompound([s for n, s, _, _ in gp if unit_id(n, gid) == unit]).BoundingBox()
            unit_centres[unit] = ub.center.toTuple()

        assy = cq.Assembly(name=gid)
        preview = cq.Assembly(name=gid)
        pj = []
        for name, shape, col, kind in gp:
            b = shape.BoundingBox()
            pc = (b.center.x, b.center.y, b.center.z)
            # part explode: radial fan from the group centre, scaled by part size
            pd = [pc[0] - gc[0], pc[1] - gc[1], pc[2] - gc[2]]
            pn = math.sqrt(sum(c * c for c in pd)) or 1.0
            size = max(b.xlen, b.ylen, b.zlen)
            pmag = pn * 1.6 + size * 1.5 + 30.0
            pexp = part_offset(name, kind, pc, gc, size, unit_centres[unit_id(name, gid)])
            assy.add(shape, name=name, color=cq.Color(*cr.hexcolor(cr.COLORS[col]), 1.0))
            if kind in PREVIEW_KINDS:
                preview.add(shape, name=name, color=cq.Color(*cr.hexcolor(cr.COLORS[col]), 1.0))
            pj.append({"unitId": unit_id(name, gid), "stage": parts[name][3], "stageLabel": cr.STEPS[parts[name][3]],
                       "description": cr.DESCRIPTIONS.get(kind, kind.replace("_", " ")),
                       "solidCount": len(shape.Solids()), "volumeMm3": round(shape.Volume(), 3), "name": name, "label": humanize(name, kind), "kind": kind, "color": cr.COLORS[col],
                       "center": [round(v, 3) for v in pc], "size": round(size, 1),
                       "bbox": [round(b.xlen, 3), round(b.ylen, 3), round(b.zlen, 3)],
                       "explode": [round(v, 1) for v in pexp]})
        assy.export(os.path.join(MODELS, f"group_{gid}.glb"), tolerance=0.4, angularTolerance=0.3)
        preview.export(os.path.join(MODELS, f"preview_{gid}.glb"), tolerance=1.1, angularTolerance=0.5)
        gb = cq.Compound.makeCompound([s for _, s, _, _ in gp]).BoundingBox()
        assets = {}
        for tier in ("group", "preview"):
            path = os.path.join(MODELS, f"{tier}_{gid}.glb")
            with open(path, "rb") as stream:
                blob = stream.read()
            assets[tier] = {"bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}
        manifest["groups"].append({"preview": f"models/preview_{gid}.glb", "assets": assets,
                                   "bbox": [gb.xlen, gb.ylen, gb.zlen],"id": gid, "label": label, "color": color, "blurb": blurb,
                                   "glb": f"models/group_{gid}.glb", "center": [round(v, 1) for v in gc],
                                   "explode": [round(v, 1) for v in gexp], "count": len(pj), "parts": pj})
        print(f"{gid}: {len(pj)} parts -> group_{gid}.glb", flush=True)

    with open(os.path.join(WEB, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, separators=(",", ":"))
    assert source_identity() == identity, "Geometry source changed during export"
    with open(os.path.join(WEB, "parts.json"), "w", encoding="utf-8") as f:
        json.dump({"source": identity, "unit": "mm", "parts": [dict(p, group=g["id"]) for g in manifest["groups"] for p in g["parts"]]}, f, indent=2)
    total = sum(g["count"] for g in manifest["groups"])
    print(f"manifest.json written: {len(manifest['groups'])} groups, {total} parts")


if __name__ == "__main__":
    main()
