@echo off

set "WORK_DIR=%~dp0"
set "ROOT_DIR=%WORK_DIR%..\"

cd /d "%ROOT_DIR%"

cscript.exe //nologo "vbs\auto_duty.vbs"
cscript.exe //nologo "vbs\check_lock.vbs"
