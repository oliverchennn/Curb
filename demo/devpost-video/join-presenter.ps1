param(
    [Parameter(Mandatory = $true)][string]$PresenterFile,
    [ValidateRange(0, 3600)][double]$StartAtSeconds = 0,
    [string]$OutputFile = (Join-Path $PSScriptRoot 'Curb-with-presenter.mp4')
)

$ErrorActionPreference = 'Stop'
$picture = Join-Path $PSScriptRoot 'Curb-picture-edit.mp4'
$presenter = (Resolve-Path -LiteralPath $PresenterFile).ProviderPath
$encoder = (Get-Command ffmpeg.exe -ErrorAction Ignore).Source
if (-not $encoder) {
    $bundled = Join-Path $PSScriptRoot '.tools/imageio_ffmpeg/binaries'
    if (Test-Path -LiteralPath $bundled) {
        $encoder = (Get-ChildItem -LiteralPath $bundled -File -Filter 'ffmpeg-*.exe' | Select-Object -First 1).FullName
    }
}
if (-not $encoder) {
    throw 'FFmpeg is needed for this helper. Open the picture edit in your editor or use a machine with FFmpeg on PATH.'
}
if (-not (Test-Path -LiteralPath $picture)) {
    throw 'Place this script alongside Curb-picture-edit.mp4.'
}
if (Test-Path -LiteralPath $OutputFile) {
    throw "Choose a new output filename with -OutputFile. Existing file: $OutputFile"
}

$start = $StartAtSeconds.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture)
$filters = "[1:v]trim=start=$($start):duration=91.8,setpts=PTS-STARTPTS+3.2/TB,scale=320:180:force_original_aspect_ratio=increase,crop=320:180,setsar=1[cam];" +
    "[0:v][cam]overlay=1544:722:eof_action=pass:repeatlast=0:enable='gte(t,3.2)*lt(t,95)'[v];" +
    "[1:a]atrim=start=$($start):duration=91.8,asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:st=0:d=0.08,afade=t=out:st=91.45:d=0.35,adelay=3200|3200,apad=whole_dur=99[a]"
$ffmpegArgs = @(
    '-hide_banner', '-loglevel', 'error', '-n', '-filter_complex_threads', '2',
    '-i', $picture, '-i', $presenter, '-filter_complex', $filters, '-map', '[v]', '-map', '[a]',
    '-t', '99', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-movflags', '+faststart', $OutputFile
)
& $encoder @ffmpegArgs
if ($LASTEXITCODE -ne 0) { throw "FFmpeg exited with code $LASTEXITCODE." }
Write-Output $OutputFile
