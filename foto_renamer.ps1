# ==============================
# PowerShell Script: Rename photos by EXIF date
# ==============================

# --- Configuration ---
$InputFolder = "C:\Users\PIuksha\Pictures\toJXL"       # Folder containing original photos
$OutputFolder = "C:\Users\PIuksha\Pictures\toJXLrenamed"     # Folder to save renamed photos


# --- Ensure output folder exists ---
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder | Out-Null
}

# --- Function to get the Date Taken from EXIF data ---
function Get-DateTaken {
    param([string]$FilePath)

    try {
        $shell = New-Object -ComObject Shell.Application
        $folder = $shell.Namespace((Split-Path $FilePath))
        $file = $folder.ParseName((Split-Path $FilePath -Leaf))
        $dateTaken = $folder.GetDetailsOf($file, 12)  # Usually index 12 = Date taken
        if ($dateTaken) {
            return [datetime]::Parse($dateTaken)
        }
    } catch {
        Write-Warning "Could not read EXIF date for $FilePath"
    }

    # Fallback to file's last write time
    return (Get-Item $FilePath).LastWriteTime
}

# --- Process all supported image files recursively ---
$Files = Get-ChildItem -Path $InputFolder -File -Recurse |
    Where-Object { $_.Extension -match '\.(jpg|jpeg|png|heic|tif|tiff)$' }

if ($Files.Count -eq 0) {
    Write-Host "⚠️ No supported image files found in $InputFolder (or subfolders)." -ForegroundColor Yellow
    exit
}

$NameTracker = @{}  # Track duplicate names

foreach ($File in $Files) {
    $DateTaken = Get-DateTaken $File.FullName
    $BaseName = $DateTaken.ToString("yyyy-MM-ddTHH_mm_ss")
    $Extension = $File.Extension.ToLower()

    # Handle duplicates
    if ($NameTracker.ContainsKey($BaseName)) {
        $NameTracker[$BaseName]++
        $NewName = "{0}_{1}{2}" -f $BaseName, $NameTracker[$BaseName], $Extension
    } else {
        $NameTracker[$BaseName] = 1
        $NewName = "{0}{1}" -f $BaseName, $Extension
    }

    $DestinationPath = Join-Path $OutputFolder $NewName

    Copy-Item -Path $File.FullName -Destination $DestinationPath -Force
    # Move-Item -Path $File.FullName -Destination $DestinationPath -Force  # Uncomment if you prefer move

    Write-Host "Renamed: $($File.Name) → $NewName"
}

Write-Host "✅ Renaming complete! Files saved to $OutputFolder" -ForegroundColor Green