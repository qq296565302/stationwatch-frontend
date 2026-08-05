' ============================================
' 值班记录表锁定检查脚本
' 版本：1.0
' 功能：检查所有工作表，锁定过期的，解锁未到期的
' ============================================

Option Explicit

Const LOCK_PASSWORD = "DutyLock2026"

Dim fso, xlApp, xlBook
Dim workDir, monthFile
Dim scriptPath, vbsDir
Dim lockedCount, unlockedCount

' 获取脚本所在目录
Set fso = CreateObject("Scripting.FileSystemObject")
scriptPath = WScript.ScriptFullName

' 使用 FileSystemObject 的 GetParentFolderName 方法
vbsDir = fso.GetParentFolderName(scriptPath)
workDir = fso.GetParentFolderName(vbsDir)

' 如果 GetParentFolderName 失败（中文路径bug），显示错误提示
If workDir = "" Or Right(workDir, 1) = ":" Then
    MsgBox "错误：无法获取工作目录路径" & vbCrLf & vbCrLf & _
           "脚本位置：" & scriptPath & vbCrLf & vbCrLf & _
           "可能原因：" & vbCrLf & _
           "1. 脚本路径包含特殊字符" & vbCrLf & _
           "2. 脚本不在正确的目录结构中" & vbCrLf & vbCrLf & _
           "请确保脚本位于：值班记录表\vbs\check_lock.vbs", _
           vbCritical, "路径错误"
    WScript.Quit
End If

' 确保 workDir 以反斜杠结尾
If Right(workDir, 1) <> "\" Then
    workDir = workDir & "\"
End If

' 查找当月值班记录文件
monthFile = workDir & "值班记录_" & Year(Date) & "-" & Right("0" & Month(Date), 2) & ".xlsx"

If Not fso.FileExists(monthFile) Then
    WScript.Echo "未找到当月值班记录文件：" & monthFile
    WScript.Quit
End If

' 启动 Excel
On Error Resume Next
Set xlApp = CreateObject("Excel.Application")
If Err.Number <> 0 Then
    WScript.Echo "无法启动 Excel"
    WScript.Quit
End If
On Error GoTo 0

xlApp.Visible = False
xlApp.DisplayAlerts = False

' 关闭目标工作簿（如果已打开）
CloseTargetWorkbook monthFile

' 打开工作簿
On Error Resume Next
Set xlBook = xlApp.Workbooks.Open(monthFile)
If Err.Number <> 0 Then
    WScript.Echo "无法打开文件：" & monthFile
    xlApp.Quit
    WScript.Quit
End If
On Error GoTo 0

' 检查所有工作表
lockedCount = 0
unlockedCount = 0

Dim ws, deadline
For Each ws In xlBook.Worksheets
    If IsDateSheet(ws.Name) Then
        If ws.Range("Z1").Value <> "" And IsDate(ws.Range("Z1").Value) Then
            deadline = CDate(ws.Range("Z1").Value)
            On Error Resume Next
            If Now > deadline Then
                ' 尝试锁定
                ws.Protect LOCK_PASSWORD
                If Err.Number = 0 Then
                    lockedCount = lockedCount + 1
                End If
                Err.Clear
            Else
                ' 尝试解锁（如果已锁定）
                If ws.ProtectionMode Then
                    ws.Unprotect LOCK_PASSWORD
                    If Err.Number = 0 Then
                        unlockedCount = unlockedCount + 1
                    End If
                    Err.Clear
                End If
            End If
            On Error GoTo 0
        End If
    End If
Next

' 保存并关闭
xlBook.Save
xlBook.Close
xlApp.Quit

Set xlBook = Nothing
Set xlApp = Nothing
Set fso = Nothing

' 静默运行：不显示弹窗，只输出结果
WScript.Echo "锁定检查完成：" & lockedCount & " 个已锁定，" & unlockedCount & " 个已解锁"

' ============================================
' 关闭目标工作簿（如果已打开）
' 说明：只关闭指定文件，不影响其他Excel文件
' ============================================
Sub CloseTargetWorkbook(targetPath)
    On Error Resume Next
    Dim wb, fileName
    fileName = fso.GetFileName(targetPath)
    
    For Each wb In xlApp.Workbooks
        If wb.Name = fileName Then
            wb.Close False  ' False表示不保存更改
            Exit For
        End If
    Next
    On Error GoTo 0
End Sub

' ============================================
' 判断是否为日期格式工作表
' ============================================
Function IsDateSheet(sheetName)
    IsDateSheet = (Len(sheetName) = 10 And _
                   Mid(sheetName, 5, 1) = "-" And _
                   Mid(sheetName, 8, 1) = "-")
End Function
