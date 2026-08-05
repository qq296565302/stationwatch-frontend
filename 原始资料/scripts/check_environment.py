"""
检查系统环境是否满足运行要求
"""
import os
import sys
import subprocess

print("=" * 60)
print("系统环境检查")
print("=" * 60)
print()

# 检查Python版本
print("【Python环境】")
print(f"Python版本: {sys.version}")
print(f"Python路径: {sys.executable}")
print()

# 检查操作系统
print("【操作系统】")
print(f"系统: {sys.platform}")
print(f"操作系统: {os.name}")
print()

# 检查Excel是否安装
print("【Excel检查】")
try:
    result = subprocess.run(
        ['reg', 'query', 'HKEY_CLASSES_ROOT\\Excel.Application\\CLSID'],
        capture_output=True,
        text=True,
        timeout=5
    )
    if result.returncode == 0:
        print("✅ Excel已安装")
    else:
        print("⚠️ 未检测到Excel")
except Exception as e:
    print(f"⚠️ 无法检测Excel: {e}")
print()

# 检查脚本目录
print("【脚本目录】")
script_dir = os.path.dirname(os.path.abspath(__file__))
print(f"脚本位置: {script_dir}")
print()

# 检查管理员权限
print("【权限检查】")
try:
    import ctypes
    is_admin = ctypes.windll.shell32.IsUserAnAdmin()
    if is_admin:
        print("✅ 当前具有管理员权限")
    else:
        print("⚠️ 当前无管理员权限（配置任务计划时需要）")
except:
    print("⚠️ 无法检测权限状态")
print()

# 检查任务计划程序
print("【任务计划程序】")
try:
    result = subprocess.run(
        ['schtasks', '/query'],
        capture_output=True,
        text=True,
        timeout=5
    )
    if result.returncode == 0:
        print("✅ 任务计划程序可用")
    else:
        print("⚠️ 任务计划程序不可用")
except Exception as e:
    print(f"⚠️ 任务计划程序检测失败: {e}")
print()

print("=" * 60)
print("环境检查完成")
print("=" * 60)
print()
print("运行要求：")
print("✅ Windows系统")
print("✅ Python 3.x")
print("✅ Microsoft Excel")
print("⚠️ 管理员权限（仅配置任务计划时需要）")
print()
input("按任意键退出...")