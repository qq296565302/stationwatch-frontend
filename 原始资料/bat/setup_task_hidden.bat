@echo off
chcp 65001 >nul
color 0A
title 创建定时任务

echo.
echo ============================================
echo   创建值班记录定时任务
echo ============================================
echo.
echo 任务名称: 值班记录每日任务
echo 执行时间: 每天 08:30
echo 执行内容: 生成工作表 + 锁定过期表
echo 运行方式: 后台静默运行
echo.
echo ============================================
echo.

cd /d "%~dp0"

echo 正在创建任务...
echo.

REM 删除旧任务（如果存在）
schtasks /delete /tn "值班记录每日任务" /f >nul 2>&1

REM 使用test_run.bat创建任务（与手动测试使用相同的脚本）
schtasks /create /tn "值班记录每日任务" /tr "\"%cd%\test_run.bat\"" /sc daily /st 08:30 /rl HIGHEST /f

if %errorlevel% equ 0 (
    echo.
    color 0A
    echo ============================================
    echo   创建成功！
    echo ============================================
    echo.
    echo 任务已创建，每天 08:30 自动运行
    echo 任务使用 test_run.bat 执行（与手动测试相同）
    echo.
    schtasks /query /tn "值班记录每日任务"
    echo.
) else (
    echo.
    color 0C
    echo ============================================
    echo   创建失败
    echo ============================================
    echo.
    echo 错误码: %errorlevel%
    echo.
    echo 解决方法：
    echo 1. 右键此文件 → 以管理员身份运行
    echo 2. 或手动创建任务计划
    echo.
)

echo ============================================
echo.
echo 按任意键退出...
pause >nul