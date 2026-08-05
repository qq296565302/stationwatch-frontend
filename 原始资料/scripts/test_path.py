"""
测试路径检测是否正常
"""
import os
import sys

print("=" * 60)
print("路径检测测试")
print("=" * 60)
print()

# 获取脚本所在目录
script_dir = os.path.dirname(os.path.abspath(__file__))
print(f"脚本所在目录: {script_dir}")

# 推断项目根目录
root_dir = os.path.dirname(script_dir)
print(f"项目根目录: {root_dir}")
print()

# 检查必要的文件和文件夹
print("【文件结构检查】")
required_paths = [
    ("bat/", "目录"),
    ("bat/setup_task_hidden.bat", "文件"),
    ("bat/remove_task.bat", "文件"),
    ("bat/run_daily_task.bat", "文件"),
    ("bat/run_daily_task_hidden.vbs", "文件"),
    ("vbs/", "目录"),
    ("vbs/auto_duty.vbs", "文件"),
    ("vbs/check_lock.vbs", "文件"),
    ("scripts/", "目录"),
    ("scripts/fix_encoding.py", "文件"),
    ("scripts/check_lock.py", "文件"),
    ("docs/", "目录"),
    ("docs/电子值班表模板.xlsx", "文件"),
]

all_ok = True
for path, path_type in required_paths:
    full_path = os.path.join(root_dir, path)
    exists = os.path.exists(full_path)
    status = "✅" if exists else "❌"
    print(f"{status} {path} ({path_type})")
    if not exists:
        all_ok = False

print()

if all_ok:
    print("=" * 60)
    print("✅ 所有文件检查通过！")
    print("=" * 60)
    print()
    print("部署路径：", root_dir)
    print()
    print("可以正常使用，请继续配置任务计划：")
    print("1. 右键 bat/setup_task_hidden.bat")
    print("2. 选择'以管理员身份运行'")
else:
    print("=" * 60)
    print("❌ 文件结构不完整！")
    print("=" * 60)
    print()
    print("请检查：")
    print("1. 文件夹结构是否完整")
    print("2. 是否缺少必要文件")
    print()
    print("必需的文件夹结构：")
    print("值班记录表/")
    print("├── bat/（4个文件）")
    print("├── vbs/（2个文件）")
    print("├── scripts/（2个文件）")
    print("└── docs/（1个文件）")

print()
input("按任意键退出...")