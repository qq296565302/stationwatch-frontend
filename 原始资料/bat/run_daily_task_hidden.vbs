Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
scriptPath = WScript.ScriptFullName
scriptDir = fso.GetParentFolderName(scriptPath)

' 动态构建批处理文件路径
batFile = fso.BuildPath(scriptDir, "run_daily_task.bat")

' 静默运行批处理文件
WshShell.Run """" & batFile & """", 0, False
