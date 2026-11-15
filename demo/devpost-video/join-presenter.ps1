param(
    [Parameter(Mandatory = $true)][string]$PresenterFile,
    [ValidateRange(0, 3600)][double]$StartAtSeconds = 0,
    [string]$OutputFile = (Join-Path $PSScriptRoot 'Curb-with-presenter.mp4')
)

$ErrorActionPreference = 'Stop'
$picture = Join-Path $PSScriptRoot 'Curb-picture-edit.mp4'
$timeline = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'timeline.json') -Raw | ConvertFrom-Json
$presenter = (Resolve-Path -LiteralPath $PresenterFile).ProviderPath
$encoder = $env:CURB_DEMO_FFMPEG
if (-not $encoder) { $encoder = (Get-Command ffmpeg.exe -ErrorAction Ignore).Source }
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

function FfmpegNumber([double]$value) {
    $value.ToString('0.###', [System.Globalization.CultureInfo]::InvariantCulture)
}
$p = $timeline.presenter
$start = FfmpegNumber $StartAtSeconds
$cueIn = FfmpegNumber $p.start
$cueOut = FfmpegNumber $p.end
$cueDuration = FfmpegNumber ($p.end - $p.start)
$fadeStart = FfmpegNumber ($p.end - $p.start - 0.35)
$delay = [int]($p.start * 1000)
$length = FfmpegNumber $timeline.seconds
$size = "$($p.width):$($p.height)"
$position = "$($p.x):$($p.y)"
$filters = "[1:v]trim=start=$($start):duration=$cueDuration,setpts=PTS-STARTPTS+$cueIn/TB,scale=$($size):force_original_aspect_ratio=increase,crop=$size,setsar=1[cam];" +
    "[0:v][cam]overlay=$($position):eof_action=pass:repeatlast=0:enable='gte(t,$cueIn)*lt(t,$cueOut)'[v];" +
    "[1:a]atrim=start=$($start):duration=$cueDuration,asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:st=0:d=0.08,afade=t=out:st=$($fadeStart):d=0.35,adelay=$delay|$delay,apad=whole_dur=$length[a]"
$ffmpegArgs = @(
    '-hide_banner', '-loglevel', 'error', '-n', '-filter_complex_threads', '2',
    '-i', $picture, '-i', $presenter, '-filter_complex', $filters, '-map', '[v]', '-map', '[a]',
    '-t', $length, '-r', "$($timeline.fps)", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-movflags', '+faststart', $OutputFile
)
& $encoder @ffmpegArgs
if ($LASTEXITCODE -ne 0) { throw "FFmpeg exited with code $LASTEXITCODE." }
Write-Output $OutputFile
