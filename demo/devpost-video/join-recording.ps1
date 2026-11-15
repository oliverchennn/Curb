param(
    [Parameter(Mandatory = $true)][string]$TeamFile,
    [Parameter(Mandatory = $true)][string]$VoiceoverFile,
    [ValidateRange(0, 3600)][double]$TeamStartSeconds = 0,
    [ValidateRange(0, 3600)][double]$VoiceStartSeconds = 0,
    [string]$OutputFile = (Join-Path $PSScriptRoot 'recordings/Curb-with-team-and-voiceover.mp4')
)

$ErrorActionPreference = 'Stop'
$picture = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'Curb-picture-edit.mp4')).ProviderPath
$timeline = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'timeline.json') -Raw | ConvertFrom-Json
$team = (Resolve-Path -LiteralPath $TeamFile).ProviderPath
$voiceover = (Resolve-Path -LiteralPath $VoiceoverFile).ProviderPath
$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputFile)
$encoder = $env:CURB_DEMO_FFMPEG
if (-not $encoder) { $encoder = (Get-Command ffmpeg -ErrorAction Ignore).Source }
if (-not $encoder) { throw 'Install FFmpeg or set CURB_DEMO_FFMPEG to its executable.' }
if (Test-Path -LiteralPath $output) { throw "Choose a new output filename. Existing file: $output" }
if ($timeline.fps -ne 30 -or $timeline.width -ne 1920 -or $timeline.height -ne 1080 -or $timeline.sampleRate -ne 48000 -or
    $timeline.seconds -ne 116 -or $timeline.team.start -ne 0 -or $timeline.team.end -ne 7 -or
    $timeline.voice.start -ne 7 -or $timeline.voice.end -ne 112) {
    throw 'This helper expects the 116-second recording skeleton with a seven-second team slot.'
}

function FfmpegNumber([double]$value) {
    $value.ToString('0.######', [Globalization.CultureInfo]::InvariantCulture)
}

$fps = $timeline.fps
$sampleRate = $timeline.sampleRate
$teamFrames = [int]($timeline.team.end * $fps)
$totalFrames = [int]($timeline.seconds * $fps)
$teamSamples = [int]($timeline.team.end * $sampleRate)
$voiceSamples = [int](($timeline.voice.end - $timeline.voice.start) * $sampleRate)
# AAC encodes 1,024-sample packets. End on the last complete packet in
# the silent tail so encoder padding cannot extend the MP4 past the picture.
$totalSamples = [int]([Math]::Floor(($timeline.seconds * $sampleRate) / 1024) * 1024)
$teamOffset = FfmpegNumber $TeamStartSeconds
$voiceOffset = FfmpegNumber $VoiceStartSeconds
$sink = if ($env:OS -eq 'Windows_NT') { 'NUL' } else { '/dev/null' }
$probeArgs = @('-hide_banner','-loglevel','error','-nostats','-progress','pipe:1','-ss',$teamOffset,'-i',$team,
    '-map','0:v:0','-an','-vf',"fps=$fps",'-frames:v',$teamFrames,'-f','null',$sink)
$probe = @(& $encoder @probeArgs)
if ($LASTEXITCODE -ne 0) { throw 'FFmpeg could not read the team camera video.' }
$lastFrame = @($probe | Where-Object { $_ -match '^frame=\d+' } | Select-Object -Last 1)
if ($lastFrame.Count -ne 1 -or $lastFrame[0] -ne "frame=$teamFrames") {
    throw 'The team video needs at least seven usable seconds after TeamStartSeconds.'
}

function Assert-DecodedAudio([string]$inputFile, [string]$offset, [string]$label) {
    $argsForAudio = @('-hide_banner','-loglevel','error','-nostats','-progress','pipe:1',
        '-ss',$offset,'-i',$inputFile,'-map','0:a:0','-vn','-t','0.25','-f','null',$sink)
    $progress = @(& $encoder @argsForAudio 2>$null)
    $code = $LASTEXITCODE
    $last = @($progress | Where-Object { $_ -match '^out_time_us=\d+$' } | Select-Object -Last 1)
    if ($code -ne 0 -or $last.Count -ne 1 -or [long]($last[0] -replace '^out_time_us=','') -le 0) {
        throw "$label has no decodable audio at its chosen start offset."
    }
}

Assert-DecodedAudio $team $teamOffset 'Team clip'
Assert-DecodedAudio $voiceover $voiceOffset 'Voiceover'

$shape = "$($timeline.width):$($timeline.height)"
$camera = "[1:v]fps=$fps,trim=end_frame=$teamFrames,setpts=N/($fps*TB),scale=${shape}:force_original_aspect_ratio=increase,crop=$shape,setsar=1,format=yuv420p[team]"
$body = "[0:v]trim=start_frame=${teamFrames}:end_frame=$totalFrames,setpts=N/($fps*TB),setsar=1,format=yuv420p[demo]"
$pictureJoin = '[team][demo]concat=n=2:v=1:a=0[v]'
$teamAudio = "[1:a]aresample=$sampleRate,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,apad,atrim=end_sample=$teamSamples[ta]"
$voiceAudio = "[2:a]aresample=$sampleRate,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,apad,atrim=end_sample=$voiceSamples[vo]"
$audioJoin = "[ta][vo]concat=n=2:v=0:a=1,apad,atrim=end_sample=$totalSamples[a]"
$filters = @($camera,$body,$pictureJoin,$teamAudio,$voiceAudio,$audioJoin) -join ';'

$parent = Split-Path -Parent $output
New-Item -ItemType Directory -Force -Path $parent | Out-Null
$temporary = Join-Path $parent ('.curb-join-' + [guid]::NewGuid().ToString('N') + '.mp4')
try {
    $ffmpegArgs = @(
        '-hide_banner','-loglevel','error','-n','-filter_complex_threads','2',
        '-i',$picture,'-ss',$teamOffset,'-i',$team,'-ss',$voiceOffset,'-i',$voiceover,
        '-filter_complex',$filters,'-map','[v]','-map','[a]',
        '-frames:v',$totalFrames,'-t',"$($timeline.seconds)",'-r',$fps,
        '-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p',
        '-c:a','aac','-b:a','192k','-ar',$sampleRate,'-movflags','+faststart',$temporary
    )
    & $encoder @ffmpegArgs
    if ($LASTEXITCODE -ne 0) { throw 'Export failed. Confirm that the team clip has mic audio and the voiceover file has an audio track.' }
    [IO.File]::Move($temporary,$output)
} finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary }
}
Write-Output $output
