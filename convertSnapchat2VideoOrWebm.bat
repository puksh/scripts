@echo off
setlocal enabledelayedexpansion
:: Output folders
mkdir "gifs" 2>nul
mkdir "encoded_with_audio" 2>nul
set count=0
for %%F in (*.mp4 *.mkv) do (
    set /a count+=1
)
set current=0
for %%F in (*.mp4 *.mkv) do (
    set /a current+=1
    set "filename=%%~nF"
    set "ext=%%~xF"
    echo [!current!/!count!] 🧪 Checking: %%F
    
    set "silent=1"
    
    :: Check if audio stream exists
    ffprobe -v error -select_streams a -show_entries stream=index -of default=noprint_wrappers=1:nokey=1 "%%F" > audio_check.tmp 2>nul
    
    if exist audio_check.tmp (
        for /f %%x in (audio_check.tmp) do (
            if not "%%x"=="" (
                echo 🎧 Audio stream exists — analyzing volume...
                ffmpeg -i "%%F" -af "volumedetect" -vn -sn -f null NUL 2> volume.txt
                for /f "tokens=2 delims=:" %%A in ('findstr "max_volume" volume.txt 2^>nul') do (
                    set "volume=%%A"
                    set "volume=!volume:~1!"
                    echo ↳ Max volume: !volume!
                    echo !volume! | findstr /i "\-inf" >nul
                    if !errorlevel! neq 0 (
                        for /f "tokens=1 delims=. " %%B in ("!volume!") do (
                            set "volNum=%%B"
                            if !volNum! geq -60 (
                                echo 🔊 Volume above -60 dB — has audio
                                set "silent=0"
                            ) else (
                                echo 🔇 Volume below -60 dB — treat as silent
                            )
                        )
                    ) else (
                        echo 🔇 Volume is -inf — treat as silent
                    )
                )
                if exist volume.txt del volume.txt
            )
        )
        del audio_check.tmp
    ) else (
        echo 🔇 No audio stream found — treat as silent
    )
    
    if "!silent!"=="1" (
        if exist "gifs\!filename!.webm" (
            echo ⚠️ WEBM already exists — skipping
        ) else (
            echo 🔄 Converting to WebM silent: %%F
            ffmpeg -y -i "%%F" -an -c:v libvpx-vp9 -crf 35 -b:v 0 -vf "fps=10,scale=480:-1" "gifs\!filename!.webm"
            echo ✅ Saved: gifs\!filename!.webm
        )
    ) else (
        if exist "encoded_with_audio\!filename!_hevc.mkv" (
            echo ⚠️ HEVC file already exists — skipping
        ) else (
            echo 🎧 Encoding to HEVC: %%F
            ffmpeg -hide_banner -stats -i "%%F" -map 0 -c:v libx265 -crf 21 -preset slow -c:a copy -c:s copy "encoded_with_audio\!filename!_hevc.mkv"
            echo ✅ Saved: encoded_with_audio\!filename!_hevc.mkv
        )
    )
    echo -------------------------------
)
echo 🎉 All done!
pause