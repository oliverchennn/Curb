"""Reproducible local normalization, LK tracking and overlay export.

Run with Python + numpy/Pillow/opencv-python-headless/imageio-ffmpeg.
AI-selected seeds/provenance are retained in robertson-analysis.json.
No detector/model inference is faked by this deterministic tracking stage.
"""
import argparse
import json
import subprocess
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/curb/surveys/robertson-hall"
DATA = ROOT / "src/data/curb/surveys"
LOCAL = ROOT / ".curb-local/frames"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
COLORS = ["#db7b27", "#4776b4", "#9460a3"]


def normalize():
    subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "warning", "-i", str(ASSETS / "source/IMG_0699.MOV"),
        "-map", "0:v:0", "-an", "-vf", "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,scale=720:1280,format=yuv420p,fps=30",
        "-c:v", "libx264", "-crf", "20", "-preset", "fast", "-movflags", "+faststart", "-map_metadata", "-1",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", str(ASSETS / "survey.mp4")], check=True)


def box_from_quad(quad, width, height):
    x0, y0 = np.min(quad, axis=0)
    x1, y1 = np.max(quad, axis=0)
    if x1 <= 0 or x0 >= width or y1 <= 0 or y0 >= height:
        return None
    x0, x1 = np.clip([x0, x1], 0, width)
    y0, y1 = np.clip([y0, y1], 0, height)
    if x1 - x0 < 12 or y1 - y0 < 8:
        return None
    return [float(x0 / width), float(y0 / height), float((x1 - x0) / width), float((y1 - y0) / height)]


def track_direction(frames, seed, end, quad):
    step = 1 if end > seed else -1
    output, diagnostics = {}, []
    height, width = frames[0].shape
    for current in range(seed, end, step):
        previous, following = frames[current], frames[current + step]
        # Nearby texture is on the same sidewalk plane; RANSAC rejects moving/outlier points.
        x0, y0 = np.min(quad, axis=0) - [30, 45]
        x1, y1 = np.max(quad, axis=0) + [30, 45]
        mask = np.zeros_like(previous)
        mask[max(0, int(y0)):min(height, int(y1)), max(0, int(x0)):min(width, int(x1))] = 255
        points = cv2.goodFeaturesToTrack(previous, maxCorners=160, qualityLevel=0.008, minDistance=7, mask=mask)
        if points is None or len(points) < 6:
            diagnostics.append({"frame": current, "reason": "too few features"}); break
        target, status, _ = cv2.calcOpticalFlowPyrLK(previous, following, points, None, winSize=(31, 31), maxLevel=4,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 40, 0.005))
        back, back_status, _ = cv2.calcOpticalFlowPyrLK(following, previous, target, None, winSize=(31, 31), maxLevel=4)
        good = (status.ravel() == 1) & (back_status.ravel() == 1) & (np.linalg.norm(points - back, axis=2).ravel() < 1.7)
        if good.sum() < 6:
            diagnostics.append({"frame": current, "reason": "forward/backward flow failed"}); break
        transform, inliers = cv2.estimateAffinePartial2D(points[good], target[good], method=cv2.RANSAC, ransacReprojThreshold=2.5)
        if transform is None or inliers.sum() < 5:
            diagnostics.append({"frame": current, "reason": "insufficient motion agreement"}); break
        scale = float(np.linalg.norm(transform[:, 0]))
        if not 0.85 < scale < 1.18:
            diagnostics.append({"frame": current, "reason": "implausible frame transform"}); break
        quad = cv2.transform(quad.reshape(1, -1, 2), transform)[0]
        box = box_from_quad(quad, width, height)
        if box is None:
            diagnostics.append({"frame": current + step, "reason": "out of view"}); break
        output[current + step] = box
    return output, diagnostics


def track():
    capture = cv2.VideoCapture(str(ASSETS / "survey.mp4"))
    frames = []
    while True:
        ok, frame = capture.read()
        if not ok: break
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    capture.release()
    analysis = json.loads((DATA / "robertson-analysis.json").read_text())
    height, width = frames[0].shape
    result = []
    for index, finding in enumerate(analysis["findings"]):
        x, y, w, h = finding["seedBoxPixels"]
        quad = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], dtype=np.float32)
        keys = {finding["seedFrame"]: box_from_quad(quad, width, height)}
        diagnostics = []
        for end in [finding["startFrame"], finding["endFrame"]]:
            values, notes = track_direction(frames, finding["seedFrame"], end, quad.copy())
            keys.update(values); diagnostics.extend(notes)
        result.append({**finding, "color": COLORS[index], "track": [{"frame": n, "box": keys[n]} for n in sorted(keys)], "diagnostics": diagnostics})
    (DATA / "robertson-tracks.json").write_text(json.dumps({"fps": 30, "frameCount": len(frames), "width": width, "height": height, "method": "Pyramidal Lucas-Kanade, forward/backward check and RANSAC local similarity; AI-reviewed anchor boxes", "findings": result}, separators=(",", ":")) + "\n")
    print(json.dumps([{ "id": f["id"], "frames": len(f["track"]), "start": f["track"][0]["frame"], "end": f["track"][-1]["frame"], "diagnostics": f["diagnostics"]} for f in result], indent=2))


def render():
    tracks = json.loads((DATA / "robertson-tracks.json").read_text())
    lookup = {f["id"]: {k["frame"]: k["box"] for k in f["track"]} for f in tracks["findings"]}
    w, h = tracks["width"], tracks["height"]
    font_path = Path('/System/Library/Fonts/Supplemental/Arial.ttf')
    font = ImageFont.truetype(str(font_path), 23) if font_path.exists() else ImageFont.load_default(size=23)
    small = ImageFont.truetype(str(font_path), 19) if font_path.exists() else ImageFont.load_default(size=19)
    proc = subprocess.Popen([FFMPEG, '-y', '-hide_banner', '-loglevel', 'warning', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h}', '-r', '30', '-i', '-', '-an',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709',
        '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
        '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1', str(ASSETS / 'annotated.mp4')], stdin=subprocess.PIPE)
    cap = cv2.VideoCapture(str(ASSETS / 'survey.mp4'))
    contact, n = [], 0
    while True:
        ok, bgr = cap.read()
        if not ok: break
        raw = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
        image = raw.copy(); draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, w, 80), fill='#173e35')
        draw.text((20, 12), 'CURB  /  Robertson Hall', font=font, fill='white')
        draw.text((20, 46), 'AI-assisted review - measurements pending', font=small, fill='#dbe9e2')
        for f in tracks['findings']:
            box = lookup[f['id']].get(n)
            if box is None: continue
            x, y, bw, bh = [box[0]*w, box[1]*h, box[2]*w, box[3]*h]
            draw.rectangle((x,y,x+bw,y+bh), outline=f['color'], width=3)
            label = f["label"]
            bounds=draw.textbbox((0,0),label,font=font);tw=bounds[2]+20
            tx=max(5,min(x,w-tw-5));ty=max(82,y-35)
            draw.rectangle((tx,ty,tx+tw,ty+32),fill='#173e35')
            draw.text((tx+10,ty+2),label,font=font,fill='white')
            if n == f['seedFrame']:
                margin=45
                crop=raw.crop((max(0,x-margin),max(0,y-margin),min(w,x+bw+margin),min(h,y+bh+margin)))
                crop.save(ASSETS/f'{f["id"]}.jpg', quality=95)
                raw.save(ASSETS/f'{f["id"]}-evidence.jpg', quality=93)
        if n==180: raw.save(ASSETS/'poster.jpg',quality=93)
        if n % 15==0:
            thumb=image.copy();thumb.thumbnail((180,320));tile=Image.new('RGB',(180,344),'white');tile.paste(thumb,(0,24));ImageDraw.Draw(tile).text((6,5),f'{n/30:.1f}s / {n}',fill='black');contact.append(tile)
        proc.stdin.write(image.tobytes());n+=1
    cap.release();proc.stdin.close()
    if proc.wait()!=0: raise RuntimeError('FFmpeg overlay render failed')
    sheet=Image.new('RGB',(1260,344*((len(contact)+6)//7)),'white')
    for j,tile in enumerate(contact):sheet.paste(tile,((j%7)*180,(j//7)*344))
    LOCAL.mkdir(parents=True,exist_ok=True);sheet.save(LOCAL/'tracked-contact.jpg',quality=95)
    print(f'Rendered {n} frames; {LOCAL / "tracked-contact.jpg"}')


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('stage',choices=['normalize','track','render','all']);args=parser.parse_args()
    for name,fn in [('normalize',normalize),('track',track),('render',render)]:
        if args.stage in (name,'all'):fn()
