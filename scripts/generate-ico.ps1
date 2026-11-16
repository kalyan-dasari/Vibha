Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\resources\icons\icon.png"
$outPath = Join-Path $PSScriptRoot "..\resources\icons\icon.ico"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source icon not found at: $srcPath"
    exit 1
}

$orig = [System.Drawing.Image]::FromFile($srcPath)
Write-Host "Original Image: $($orig.Width)x$($orig.Height)"

$sizes = @(256, 128, 64, 48, 32, 16)
$entries = @()
$dataList = @()

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $s, $s)
    $g.DrawImage($orig, $rect)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    $bmp.Dispose()

    $dataList += ,$bytes
    Write-Host "Generated $s`x$s PNG: $($bytes.Length) bytes"
}

$orig.Dispose()

# Calculate total size and offsets for multi-resolution ICO
$count = $sizes.Count
$header = New-Object byte[] 6
$header[0] = 0; $header[1] = 0 # Reserved
$header[2] = 1; $header[3] = 0 # Type: 1 = ICO
$header[4] = [byte]($count -band 0xFF)
$header[5] = [byte](($count -shr 8) -band 0xFF)

$offset = 6 + ($count * 16)
$dirEntries = @()

for ($i = 0; $i -lt $count; $i++) {
    $s = $sizes[$i]
    $data = $dataList[$i]
    $len = $data.Length

    $w = if ($s -ge 256) { 0 } else { [byte]$s }
    $h = if ($s -ge 256) { 0 } else { [byte]$s }

    $entry = New-Object byte[] 16
    $entry[0] = $w
    $entry[1] = $h
    $entry[2] = 0 # Color palette
    $entry[3] = 0 # Reserved
    $entry[4] = 1; $entry[5] = 0 # Color planes
    $entry[6] = 32; $entry[7] = 0 # Bits per pixel
    $entry[8]  = [byte]($len -band 0xFF)
    $entry[9]  = [byte](($len -shr 8) -band 0xFF)
    $entry[10] = [byte](($len -shr 16) -band 0xFF)
    $entry[11] = [byte](($len -shr 24) -band 0xFF)
    $entry[12] = [byte]($offset -band 0xFF)
    $entry[13] = [byte](($offset -shr 8) -band 0xFF)
    $entry[14] = [byte](($offset -shr 16) -band 0xFF)
    $entry[15] = [byte](($offset -shr 24) -band 0xFF)

    $dirEntries += ,$entry
    $offset += $len
}

$fs = [System.IO.File]::Create($outPath)
$fs.Write($header, 0, $header.Length)
foreach ($e in $dirEntries) {
    $fs.Write($e, 0, $e.Length)
}
foreach ($d in $dataList) {
    $fs.Write($d, 0, $d.Length)
}
$fs.Dispose()

Write-Host "Successfully generated multi-resolution icon.ico ($((Get-Item $outPath).Length) bytes) at $outPath"
