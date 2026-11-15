"""Reproduce the five Robertson presenter stills from exact decoded frames."""

import argparse
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import struct
import subprocess


ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/data/curb/surveys"
SURVEY_ID = "robertson-hall"
SOURCE_ROOT = "/curb/surveys/" + SURVEY_ID
ASSET_ROOT = SOURCE_ROOT + "/presenter-v1"
OUTPUT_METADATA = DATA / "robertson-presenter-frames.json"
MEDIA = {
    "src": SOURCE_ROOT + "/survey.mp4",
    "sourceSrc": SOURCE_ROOT + "/source/IMG_0699.MOV",
    "originalSha256": "30af8768d3fc32912c8eece62eda8921e5d121ede1a621988753c4bd29de5b6a",
    "normalizedSha256": "52b364f88dd42f66fe924f2d5a25ef6cf642a8ce272790bc315ee78427831ff6",
    "width": 720,
    "height": 1280,
    "fps": 30,
    "frameCount": 419,
}
TRACK_DATA_SHA256 = "d2f7b2f2361101a9f11aaaf429689c0cecae8a9df22f31b3e58f9cff7f582186"
TRACK_FINGERPRINT = "sha256-u32le-f64le-v1"

# Frames are zero-based. Padding is left, top, right, bottom in source pixels.
CHOICES = {
    "defect-01": (210, 195, (65, 57, 75, 64),
                  "The ragged opening at the left and the crack across the panel have clearer "
                  "edges. The adjacent joints and right panel edge are still in view."),
    "defect-02": (285, 264, (70, 52, 78, 104),
                  "The branch and small opening read more clearly than at the 9.5-second "
                  "anchor. The crop retains the branch below the retained box and the panel joint."),
    "defect-03": (360, 326, (85, 55, 94, 60),
                  "The curved split is sharper and visible with both bounding panel joints. "
                  "The later anchor is larger but loses context at the source edges."),
    "defect-04": (180, 180, (66, 62, 36, 65),
                  "The 6-second anchor shows the central breakup and the adjoining joint "
                  "clearly enough for review. The damaged area continues toward the right "
                  "source edge. Nearby frames trade some of that context for size or sharpness."),
    "defect-05": (418, 398, (86, 61, 62, 68),
                  "The transverse crack is sharper and both panel edges remain visible. "
                  "The final decoded frame crops more tightly at the sides."),
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def asset_path(src):
    return ROOT / "public" / src.lstrip("/")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def track_fingerprint(track):
    """Serialize the frame/key geometry with the browser DataView layout."""
    return sha256(b"".join(struct.pack("<I4d", key["frame"], *key["box"]) for key in track))


def source_tracks():
    video = asset_path(MEDIA["src"])
    original = asset_path(MEDIA["sourceSrc"])
    require(sha256(video.read_bytes()) == MEDIA["normalizedSha256"], "Normalized media hash changed.")
    require(sha256(original.read_bytes()) == MEDIA["originalSha256"], "Original media hash changed.")
    # Git's committed track blob uses LF. Windows text checkouts can use CRLF.
    track_bytes = (DATA / "robertson-tracks.json").read_bytes().replace(b"\r\n", b"\n")
    require(sha256(track_bytes) == TRACK_DATA_SHA256, "Retained track file hash changed.")
    retained = json.loads(track_bytes)
    survey = json.loads((DATA / "robertson-hall.json").read_bytes())
    require(survey["id"] == SURVEY_ID, "Unexpected survey.")
    for key in ("src", "sourceSrc", "originalSha256", "width", "height", "fps"):
        require(survey["media"][key] == MEDIA[key], "Survey media mismatch: " + key)
    for key in ("width", "height", "fps", "frameCount"):
        require(retained[key] == MEDIA[key], "Retained media mismatch: " + key)
    require(
        math.isclose(survey["media"]["durationSeconds"], MEDIA["frameCount"] / MEDIA["fps"]),
        "Unexpected survey duration.",
    )
    tracks = {entry["id"]: entry["track"] for entry in retained["findings"]}
    findings = {entry["id"]: entry for entry in survey["findings"]}
    require(
        len(survey["findings"]) == len(retained["findings"]) == len(CHOICES)
        and tracks.keys() == findings.keys() == CHOICES.keys(),
        "Unexpected finding IDs.",
    )
    for finding_id, (canonical, _, _, _) in CHOICES.items():
        track = tracks[finding_id]
        indices = [key["frame"] for key in track]
        require(
            indices and 0 <= indices[0] <= indices[-1] < MEDIA["frameCount"]
            and indices == list(range(indices[0], indices[-1] + 1)),
            "Unexpected retained track span: " + finding_id,
        )
        require(findings[finding_id]["track"] == track, "Survey track mismatch: " + finding_id)
        require(
            math.isclose(findings[finding_id]["evidenceTime"], canonical / MEDIA["fps"]),
            "Canonical evidence frame mismatch: " + finding_id,
        )
        require(canonical in indices, "Canonical frame has no retained box: " + finding_id)
    return video, tracks


def ffmpeg_run(exe, video, log_level, output):
    return subprocess.run(
        [exe, "-hide_banner", "-nostdin", "-loglevel", log_level, "-nostats",
         "-threads", "1", "-filter_threads", "1", "-i", str(video),
         "-map", "0:v:0", "-an", "-sn", "-dn", "-vsync", "0", *output],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    )


def verify_decoded_timeline(exe, video):
    log = ffmpeg_run(exe, video, "info", ["-vf", "showinfo", "-f", "null", "pipe:1"])
    info = log.stderr.decode("utf-8", errors="replace")
    time_config = re.search(r"config in time_base:\s*(\d+/\d+), frame_rate:\s*(\d+/\d+)", info)
    require(time_config is not None, "FFmpeg did not report the decoded stream time base.")
    time_base = Fraction(time_config.group(1))
    require(Fraction(time_config.group(2)) == MEDIA["fps"], "Unexpected source frame rate.")
    frames = re.findall(r"\bn:\s*(\d+)\s+pts:\s*(-?\d+).*?\bs:(\d+)x(\d+)", info)
    require(len(frames) == MEDIA["frameCount"], "Unexpected decoded frame count.")
    for expected, record in enumerate(frames):
        index, pts, width, height = map(int, record)
        require(
            index == expected and pts * time_base == Fraction(expected, MEDIA["fps"])
            and (width, height) == (MEDIA["width"], MEDIA["height"]),
            "Unexpected decoded frame/timestamp/size at index " + str(expected),
        )


def crop_rect(box, padding):
    x, y, width, height = box
    frame_width, frame_height = MEDIA["width"], MEDIA["height"]
    require(
        all(math.isfinite(value) for value in box) and x >= 0 and y >= 0
        and width > 0 and height > 0 and x + width <= 1 + 1e-8 and y + height <= 1 + 1e-8,
        "Selected box lies outside the normalized image.",
    )
    left = max(0, math.floor(x * frame_width) - padding[0])
    top = max(0, math.floor(y * frame_height) - padding[1])
    right = min(frame_width, math.ceil((x + width) * frame_width) + padding[2])
    bottom = min(frame_height, math.ceil((y + height) * frame_height) + padding[3])
    return {"x": left, "y": top, "width": right - left, "height": bottom - top}


def extract_jpeg(exe, video, frame, rect=None):
    # Matrix conversion changes colour representation only. Keep source pixel size.
    filters = [
        "select=eq(n\\,{})".format(frame),
        "scale=in_color_matrix=bt709:out_color_matrix=bt601:out_range=pc",
        "format=yuvj444p",
    ]
    if rect is not None:
        filters.append("crop={width}:{height}:{x}:{y}:exact=1".format(**rect))
    result = ffmpeg_run(exe, video, "error", [
        "-vf", ",".join(filters), "-frames:v", "1", "-map_metadata", "-1",
        "-c:v", "mjpeg", "-threads", "1", "-q:v", "2", "-flags:v", "+bitexact",
        "-f", "image2pipe", "pipe:1",
    ])
    require(result.stdout[:2] == b"\xff\xd8" and result.stdout[-2:] == b"\xff\xd9",
            "FFmpeg did not emit a complete JPEG for frame " + str(frame))
    return result.stdout


def dimensions_from_jpeg(data):
    pos = 2
    while pos + 9 < len(data):
        marker = data[pos:pos + 2]
        size = int.from_bytes(data[pos + 2:pos + 4], "big")
        if marker == b"\xff\xc0":
            height, width = struct.unpack(">HH", data[pos + 5:pos + 9])
            return width, height
        require(size >= 2 and marker[0] == 255, "Malformed JPEG segments.")
        pos += 2 + size
    raise ValueError("Missing JPEG baseline frame marker.")


def prepare(exe):
    video, tracks = source_tracks()
    verify_decoded_timeline(exe, video)
    assets = {}
    frames = []
    for finding_id, (canonical, selected, padding, rationale) in CHOICES.items():
        track = tracks[finding_id]
        key = next((key for key in track if key["frame"] == selected), None)
        require(key is not None, "Selected frame has no retained box: " + finding_id)
        rect = crop_rect(key["box"], padding)
        full_src = ASSET_ROOT + "/" + finding_id + "-frame.jpg"
        crop_src = ASSET_ROOT + "/" + finding_id + "-crop.jpg"
        full = extract_jpeg(exe, video, selected)
        crop = extract_jpeg(exe, video, selected, rect)
        require(dimensions_from_jpeg(full) == (MEDIA["width"], MEDIA["height"]), "Full frame dimensions changed.")
        require(dimensions_from_jpeg(crop) == (rect["width"], rect["height"]), "Crop dimensions changed.")
        assets[asset_path(full_src)] = full
        assets[asset_path(crop_src)] = crop
        frames.append({
            "findingId": finding_id,
            "canonicalFrame": canonical,
            "frame": selected,
            "seconds": selected / MEDIA["fps"],
            "decision": "retain" if selected == canonical else "change",
            "trackSpan": [track[0]["frame"], track[-1]["frame"]],
            "trackSha256": track_fingerprint(track),
            "normalizedBox": key["box"],
            "cropRectPixels": rect,
            "fullFrameSrc": full_src,
            "cropSrc": crop_src,
            "fullFrameSha256": sha256(full),
            "cropSha256": sha256(crop),
            "rationale": rationale,
        })
    metadata = {
        "schemaVersion": 1,
        "surveyId": SURVEY_ID,
        "media": MEDIA,
        "trackFingerprintAlgorithm": TRACK_FINGERPRINT,
        "trackDataSha256": TRACK_DATA_SHA256,
        "frames": frames,
    }
    assets[OUTPUT_METADATA] = (json.dumps(metadata, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    return assets, frames


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default="ffmpeg", help="Path or executable name for FFmpeg.")
    parser.add_argument("--check", action="store_true", help="Regenerate in memory and verify existing files.")
    args = parser.parse_args()
    exe = shutil.which(args.ffmpeg)
    if exe is None:
        parser.error("FFmpeg was not found. Set --ffmpeg to an installed executable.")
    try:
        assets, frames = prepare(exe)
        for path, expected in assets.items():
            if args.check:
                actual = path.read_bytes()
                if path == OUTPUT_METADATA:
                    actual = actual.replace(b"\r\n", b"\n")
                require(actual == expected, "Regenerated bytes differ: " + str(path.relative_to(ROOT)))
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(expected)
    except subprocess.CalledProcessError as error:
        parser.exit(1, "FFmpeg failed: " + error.stderr.decode("utf-8", errors="replace") + "\n")
    except (OSError, ValueError) as error:
        parser.exit(1, str(error) + "\n")
    action = "Verified" if args.check else "Wrote"
    print("{} ten JPEGs and presenter metadata for {} decoded frames.".format(action, MEDIA["frameCount"]))
    for frame in frames:
        print("{findingId}: {canonicalFrame} -> {frame} ({seconds:.6f} s, {decision})".format(**frame))


if __name__ == "__main__":
    main()
