@echo off
color 0C
title 删除定时任务

echo.
echo ============================================
echo   删除值班记录定时任务
echo ============================================
echo.
echo 任务名称: 值班记录每日任务
echo.

echo 正在删除任务...
echo.

schtasks /delete /tn "值班记录每日任务" /f

if %errorlevel% equ 0 (
    echo.
    color 0A
    echo ============================================
    echo   删除成功！
    echo ============================================
    echo.
    echo 任务已删除
    echo.
) else (
    echo.
    color 0C
    echo ============================================
    echo   删除失败或任务不存在
    echo ============================================
    echo.
    echo 错误码: %errorlevel%
    echo.
)

echo ============================================
echo.
echo 按任意键退出...
pause >nul
