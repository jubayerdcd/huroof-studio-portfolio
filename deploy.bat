@echo off
echo.
echo  ========================================
echo   Huroof Studio - Auto Deploy
echo  ========================================
echo.

cd /d "%~dp0"

echo  [1/3] Staging all changes...
git add .

echo  [2/3] Committing...
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATE=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a:%%b
git commit -m "Update site - %DATE% %TIME%"

echo  [3/3] Pushing to GitHub...
git push origin main

echo.
echo  ========================================
echo   SUCCESS! Site will update in ~30 sec.
echo   Visit: https://huroofstudio.com
echo  ========================================
echo.
pause
