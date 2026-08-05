@echo off
echo ============================================
echo   Test Task Execution - %date% %time%
echo ============================================
echo.

cd /d "%~dp0"
cd ..
echo Current directory: %cd%
echo.

echo Checking files...
echo.
dir /b vbs\*.vbs
echo.

echo Executing task...
echo.

echo Step 1: Generate daily worksheet
cscript.exe //nologo "vbs\auto_duty.vbs"
echo Return code: %errorlevel%
echo.

echo Step 2: Check and lock expired worksheets
cscript.exe //nologo "vbs\check_lock.vbs"
echo Return code: %errorlevel%
echo.

echo ============================================
echo   Task execution completed
echo ============================================
echo.
echo Please check:
echo 1. Excel file generated or updated
echo 2. Any error messages
echo.

pause