#!/usr/bin/env python3
"""Package verified default reports and local videos for an offline presentation.

Run verify_report_bundle.ts first and save its JSON stdout. This command checks
the receipt against the exact files; it does not claim a new browser/build pass.
Supply a release JSON recording the actual verified source and checks.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reports', type=Path, default=ROOT / '.curb-local/release')
    parser.add_argument('--verification', type=Path, required=True)
    parser.add_argument('--release', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True,
                        help='New directory; existing directories are preserved and rejected.')
    args = parser.parse_args()
    receipt = json.loads(args.verification.read_text())
    release = json.loads(args.release.read_text())
    require(release.get('repository') == 'https://github.com/oliverchennn/Curb', 'Wrong repository in release metadata')
    source = release.get('verifiedHead', '')
    require(len(source) == 40 and all(c in '0123456789abcdef' for c in source), 'Release must identify a full verified source SHA')
    require(not args.output.exists(), 'Output already exists; choose a new directory to preserve previous kits')
    archive = args.output.with_suffix('.zip')
    require(not archive.exists(), 'ZIP already exists; choose a new output name')
    variants = [v for v in receipt['variants'] if v['name'] == 'default']
    require(len(variants) == 1, 'Verification receipt must identify exactly one default report')
    for extension, expected in variants[0]['sha256'].items():
        path = args.reports / ('default.' + extension)
        require(path.is_file() and digest(path) == expected, 'Report receipt mismatch: ' + path.name)
    survey = json.loads((args.reports / 'default.json').read_text())
    canonical = json.loads((ROOT / 'src/data/curb/surveys/robertson-hall.json').read_text())
    require(survey == canonical, 'Venue kit must use the canonical pending-review survey, not disposable edits')
    media = ROOT / 'public/curb/surveys/robertson-hall'
    backup_receipt = json.loads((media / 'demo-backup.json').read_text())
    require(digest(media / 'demo-backup.mp4') == backup_receipt['sha256'], 'Backup video does not match its receipt')
    annotated = [item for item in backup_receipt['inputs'] if Path(item['path']).name == 'annotated.mp4']
    require(len(annotated) == 1 and digest(media / 'annotated.mp4') == annotated[0]['sha256'],
            'Annotated video does not match the verified walkthrough input')
    files = {
        'repair-report.pdf': args.reports / 'default.pdf',
        'repair-report.html': args.reports / 'default.html',
        'survey.json': args.reports / 'default.json',
        'inventory.csv': args.reports / 'default.csv',
        'robertson-annotated.mp4': media / 'annotated.mp4',
        'curb-offline-walkthrough.mp4': media / 'demo-backup.mp4',
        'WALKTHROUGH.json': media / 'demo-backup.json',
        'PORTABLE-REPORTS.md': ROOT / 'docs/demo/ROBERTSON_PORTABLE_RELEASE.md',
        'PRESENTER-SCRIPT.md': ROOT / 'docs/demo/ROBERTSON_DEMO_SCRIPT.md',
    }
    require(all(path.is_file() for path in files.values()), 'A required kit input is missing')
    args.output.mkdir(parents=True)
    for name, path in files.items():
        shutil.copyfile(path, args.output / name)
    (args.output / 'RELEASE.json').write_text(json.dumps(release, indent=2) + '\n')
    (args.output / 'START-HERE.txt').write_text(
        'Curb — Robertson Hall offline presentation kit\n\n'
        '1. Play curb-offline-walkthrough.mp4 for the edited two-minute fallback. '
        'It combines real captured app states, annotated footage and a report page; it is not a continuous live session.\n'
        '2. Open repair-report.html directly in a browser. All five photos are embedded. '
        'Use its semantic navigation; the PDF is an untagged print/visual alternative. '
        'External source links need internet only if followed.\n'
        '3. robertson-annotated.mp4 contains fixed original proposal labels. '
        'survey.json and inventory.csv hold the canonical five pending findings.\n\n'
        'No measured dimensions, overall ADA verdict or verified Robertson route availability are established. '
        'Costs are partial benchmark estimates with assumed quantities and required quotes. '
        'Any robot scene is a collection concept; archive geometry is not a field observation.\n\n'
        'The interactive app is separate from this ZIP. Before the venue, install the locked dependencies '
        'in the matching Git checkout with Node.js 22.23.0 or newer, run npm run check, then '
        'npm run start -- --port 3004. '
        'Open http://127.0.0.1:3004/. Local media, maps and report generation do not require venue Wi-Fi. '
        'Download review JSON before leaving or reloading the page.\n\n'
        'RELEASE.json identifies the actual source and verification. SHA256.json identifies each included file. '
        'The source MOV remains preserved in the repository.\n')
    hashes = {p.name: digest(p) for p in sorted(args.output.iterdir()) if p.is_file()}
    (args.output / 'SHA256.json').write_text(json.dumps(hashes, indent=2) + '\n')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(args.output.iterdir()):
            z.write(path, arcname=args.output.name + '/' + path.name)
    with zipfile.ZipFile(archive) as z:
        require(z.testzip() is None, 'ZIP integrity check failed')
    print(json.dumps({'zip': str(archive), 'bytes': archive.stat().st_size,
                      'sha256': digest(archive), 'files': len(hashes) + 1}, indent=2))


if __name__ == '__main__':
    main()
