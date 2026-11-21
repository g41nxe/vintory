# Erzeugt docs/images/vorschau.png aus docs/images/weinliste.jpg und erfassen.jpg.
# Aufruf (PowerShell, im Repo-Ordner): .\scripts\make-readme-preview.ps1
param([string]$Repo = (Split-Path -Parent $PSScriptRoot))
Add-Type -AssemblyName System.Drawing

$img = Join-Path $Repo 'docs\images'
$W = 1400; $H = 1000
$canvas = New-Object System.Drawing.Bitmap -ArgumentList $W, $H
$g = [System.Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background: deep burgundy gradient (app colors #8c1c2e / #12080a)
$bgRect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList $bgRect, ([System.Drawing.Color]::FromArgb(255, 74, 16, 28)), ([System.Drawing.Color]::FromArgb(255, 18, 8, 10)), 55.0
$g.FillRectangle($bg, $bgRect)
# soft gold glow in the middle
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(250, 150, 900, 700)
$glow = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList $glowPath
$glow.CenterColor = [System.Drawing.Color]::FromArgb(60, 212, 175, 55)
$glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 212, 175, 55))
$g.FillPath($glow, $glowPath)

function New-RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function Draw-Phone([string]$file, [float]$x, [float]$y, [float]$screenW, [string]$caption) {
  $shot = [System.Drawing.Image]::FromFile($file)
  [float]$screenH = $screenW * $shot.Height / $shot.Width
  $bezel = 14
  $fw = $screenW + 2 * $bezel; $fh = $screenH + 2 * $bezel

  # shadow (a few soft layers)
  for ($i = 6; $i -ge 1; $i--) {
    $sp = New-RoundRect ($x + 4) ($y + 18 + $i * 2) $fw $fh (48 + $i)
    $sb = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(22, 0, 0, 0))
    $g.FillPath($sb, $sp)
  }
  # phone body + thin gold edge
  $body = New-RoundRect $x $y $fw $fh 48
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 14, 10, 12))), $body)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 212, 175, 55)), 2), $body)

  # screen with rounded corners
  $screen = New-RoundRect ($x + $bezel) ($y + $bezel) $screenW $screenH 36
  $g.SetClip($screen)
  $g.DrawImage($shot, [float]($x + $bezel), [float]($y + $bezel), $screenW, $screenH)
  $g.ResetClip()
  $shot.Dispose()

  # caption
  $font = New-Object System.Drawing.Font -ArgumentList 'Segoe UI Semibold', 22, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $capRect = New-Object System.Drawing.RectangleF -ArgumentList $x, ($y + $fh + 26), $fw, 40
  $g.DrawString($caption, $font, (New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 212, 175, 55))), $capRect, $fmt)
}

# Two phones, slightly offset for depth
Draw-Phone (Join-Path $img 'weinliste.jpg') 300 70 360 'Weinliste'
Draw-Phone (Join-Path $img 'erfassen.jpg') 740 110 360 'Verkostung erfassen'

$out = Join-Path $img 'vorschau.png'
$canvas.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $canvas.Dispose()
"{0}: {1} KB" -f $out, [int]((Get-Item -LiteralPath $out).Length / 1024)
