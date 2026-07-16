@echo off
cd /d "%~dp0"

echo ========================================
echo   1. 사진/음악 목록 갱신 및 리사이즈
echo ========================================
python scripts\generate_manifest.py
if errorlevel 1 (
    echo.
    echo [오류] 갱신에 실패했습니다. 위 메시지를 확인하세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   2. 변경사항 확인
echo ========================================
git status --porcelain | findstr . >nul
if errorlevel 1 (
    echo 변경된 내용이 없습니다. 배포할 것이 없어요.
    pause
    exit /b 0
)
git status --short

echo.
echo ========================================
echo   3. GitHub에 업로드 (자동 배포 시작)
echo ========================================
git add -A
git commit -m "Update site content"
git push
if errorlevel 1 (
    echo.
    echo [오류] 업로드에 실패했습니다. 인터넷 연결 또는 GitHub 로그인을 확인하세요.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   완료! 1~2분 후 사이트에 반영됩니다.
echo   https://wedding-invitation-beta-lime.vercel.app/
echo ========================================
pause
