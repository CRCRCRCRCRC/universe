@echo off
REM 自動 add、commit、push 到 main

echo.
set /p commitMsg=Enter the commit message： 

git add .
git commit -m "%commitMsg%"
if errorlevel 1 goto end

git push origin main

:end
echo.
pause
