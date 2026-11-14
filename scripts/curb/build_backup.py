#!/usr/bin/env python3
"""Build a two-minute offline walkthrough from actual UI/report captures and the clip.

Capture the named JPEGs with the browser first. This is an edited walkthrough of
captured states, not a continuous screen recording or a simulated live session.
Requires the same Pillow and imageio-ffmpeg environment as process_video.py.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
WIDTH, HEIGHT, FPS = 1600, 1100, 30
STEPS = [
    ("walkthrough-00-upload.jpg", 10, "Start a prepared survey walkthrough",
     "The upload demo uses a labeled ten-second simulation, then opens preprocessed Robertson findings."),
    ("walkthrough-01-survey.jpg", 8, "Review the actual Robertson Hall survey",
     "Five AI-assisted proposals. Human field review and measurements are still needed."),
    ("@video", 14, "Play the full annotated clip",
     "Stable finding IDs follow retained evidence frames. Missing boxes do not prove absence."),
    ("walkthrough-02-evidence.jpg", 10, "Inspect the connected surface breakup",
     "Defect 04 is one repair area; intersecting cracks are not separately charged as replacement."),
    ("walkthrough-03-inspection.jpg", 12, "Connect visible evidence to possible access effects",
     "Dimensions and route impact remain unknown. Technical checks require field measurements."),
    ("walkthrough-04-plans.jpg", 14, "Compare essential, balanced and durable policies",
     "These are partial benchmarks using assumed quantities. Quote-required work remains visible."),
    ("walkthrough-05-budget.jpg", 14, "Use a budget to choose scope, not erase unmet needs",
     "At $500, one sealing option has a $72–$478 priced subtotal. Shared setup still needs a quote."),
    ("walkthrough-06-exports.jpg", 10, "Export the reviewed repair brief",
     "PDF, HTML, JSON and CSV reflect current review. The annotated video retains its original labels."),
    ("walkthrough-08-collection.jpg", 10, "Explore the proposed collection robot",
     "A simulated camera rig explains the collection concept. It is not footage of deployed hardware."),
    ("walkthrough-09-explorer.jpg", 10, "Inspect route geography and its supporting records",
     "Archive geometry and field observations stay distinct. Current traversal remains unknown."),
    ("walkthrough-07-report.jpg", 8, "Take the evidence and open questions to facilities",
     "The saved HTML includes its photos and works without the app. Confirm suitability and obtain quotes."),
]


def font(size, bold=False):
    names = [Path('/System/Library/Fonts/Supplemental') / ('Arial Bold.ttf' if bold else 'Arial.ttf'),
             Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]
    return next((ImageFont.truetype(str(p), size) for p in names if p.exists()), ImageFont.load_default(size=size))


def background(title, caption):
    image = Image.new('RGB', (WIDTH, HEIGHT), '#fcfaf3')
    draw = ImageDraw.Draw(image)
    draw.line((64, 952, WIDTH-64, 952), fill='#b3bcad', width=2)
    draw.text((64, 970), title, font=font(30, True), fill='#234336')
    draw.text((64, 1015), caption, font=font(23), fill='#243128')
    draw.text((64, 1060), 'CURB  ·  Captured app states, report page and source footage  ·  Offline backup walkthrough', font=font(17), fill='#46534a')
    return image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--captures', type=Path, default=ROOT/'.curb-local/release/screenshots')
    parser.add_argument('--output', type=Path, default=ROOT/'.curb-local/release/curb-offline-walkthrough.mp4')
    parser.add_argument('--collection-recording', type=Path,
                        help='Optional actual browser recording to replace the collection still.')
    args = parser.parse_args()
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    clip = ROOT/'public/curb/surveys/robertson-hall/annotated.mp4'
    inputs = [clip if name == '@video' else
              args.collection_recording if name == 'walkthrough-08-collection.jpg' and args.collection_recording else
              args.captures/name for name, *_ in STEPS]
    missing = [str(p) for p in inputs if not p.is_file()]
    if missing:
        raise SystemExit('Capture or provide these real inputs first: ' + ', '.join(missing))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='curb-walkthrough-') as temporary:
        temp = Path(temporary)
        segments = []
        for index, ((name, duration, title, caption), source) in enumerate(zip(STEPS, inputs)):
            canvas = background(title, caption)
            frame = temp/f'{index}.png'
            output = temp/f'{index}.mp4'
            is_video = name == '@video' or (name == 'walkthrough-08-collection.jpg' and args.collection_recording)
            if not is_video:
                with Image.open(source) as screenshot:
                    screenshot = screenshot.convert('RGB')
                    screenshot.thumbnail((1472, 920), Image.Resampling.LANCZOS)
                    canvas.paste(screenshot, ((WIDTH-screenshot.width)//2, (952-screenshot.height)//2))
                canvas.save(frame)
                command = [ffmpeg, '-y', '-loglevel', 'error', '-loop', '1', '-framerate', str(FPS), '-i', str(frame)]
            else:
                canvas.save(frame)
                command = [ffmpeg, '-y', '-loglevel', 'error', '-loop', '1', '-framerate', str(FPS), '-i', str(frame), '-i', str(source),
                           '-filter_complex', '[1:v]scale=1472:920:force_original_aspect_ratio=decrease:force_divisible_by=2,tpad=stop_mode=clone:stop_duration=1[clip];[0:v][clip]overlay=(W-w)/2:(952-h)/2:shortest=1']
            command += ['-t', str(duration), '-r', str(FPS), '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', str(output)]
            subprocess.run(command, check=True)
            segments.append(output)
        concat = temp/'segments.txt'
        concat.write_text(''.join("file '" + str(p) + "'\n" for p in segments))
        subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', '-movflags', '+faststart', str(args.output)], check=True)
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    receipt = {'kind': 'edited walkthrough from actual captures and annotated footage', 'durationSeconds': sum(step[1] for step in STEPS),
               'output': str(args.output), 'sha256': digest(args.output),
               'inputs': [{'path': str(p), 'sha256': digest(p)} for p in inputs]}
    args.output.with_suffix('.json').write_text(json.dumps(receipt, indent=2)+'\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
