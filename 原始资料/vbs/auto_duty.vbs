' ============================================
' 值班记录表自动生成脚本
' 版本：2.0
' 更新：2026-07-28
' ============================================

Option Explicit

' ============================================
' 【常量定义】
' ============================================
Const TEMPLATE_FILE = "电子值班表模板.xlsx"
Const LOCK_PASSWORD = "DutyLock2026"
Const DEADLINE_TIME = "08:30:00"
Const STATION_NAME = "张店供电中心马尚供电所"

' Excel 数据验证常量已移除（直接使用数字以避免VBScript兼容性问题）
' 3=xlValidateList, 1=xlValidAlertStop, 1=xlBetween

' ============================================
' 【配置项说明】
' - TEMPLATE_FILE : 模板文件名（放在 docs 文件夹下）
' - LOCK_PASSWORD : 工作表锁定密码
' - DEADLINE_TIME : 第二天锁定时间（HH:MM:SS 格式）
' - STATION_NAME  : 供电所名称（显示在第一行标题中）
' ============================================

' ============================================
' 【变量声明】
' ============================================
Dim fso, xlApp, xlBook
Dim workDir, templateFile, monthFile, sheetName
Dim today, tomorrow, monthStr
Dim isNewFile
Dim dutyPersons
Dim scriptPath, vbsDir

' ============================================
' 【可修改】值班人员名单（5天一轮）
' 格式：每组人员用"、"分隔
' 注意：保持 Array() 和引号格式，只修改人名
' ============================================
dutyPersons = Array("王永、王春康、颜知非", "钱玉、赵金光、王欣", "张振强、党传磊、刘辰琪", "李栋、宋儒滨、王卓", "朱玉峰、张方琦、曹永宏")

' ============================================
' 【初始化】获取脚本所在目录
' ============================================
Set fso = CreateObject("Scripting.FileSystemObject")

' 使用动态路径查找（从脚本位置推断）
scriptPath = WScript.ScriptFullName

' 方案：使用 FileSystemObject 的 GetParentFolderName 方法
' 注意：在中文路径下需要特殊处理
vbsDir = fso.GetParentFolderName(scriptPath)
workDir = fso.GetParentFolderName(vbsDir)

' 如果 GetParentFolderName 失败（中文路径bug），显示错误提示
If workDir = "" Or Right(workDir, 1) = ":" Then
    MsgBox "错误：无法获取工作目录路径" & vbCrLf & vbCrLf & _
           "脚本位置：" & scriptPath & vbCrLf & vbCrLf & _
           "可能原因：" & vbCrLf & _
           "1. 脚本路径包含特殊字符" & vbCrLf & _
           "2. 脚本不在正确的目录结构中" & vbCrLf & vbCrLf & _
           "请确保脚本位于：值班记录表\vbs\auto_duty.vbs", _
           vbCritical, "路径错误"
    WScript.Quit
End If

' 确保 workDir 以反斜杠结尾
If Right(workDir, 1) <> "\" Then
    workDir = workDir & "\"
End If

templateFile = workDir & "docs\" & TEMPLATE_FILE

today = Date
tomorrow = Date + 1
monthStr = Year(today) & "-" & Right("0" & Month(today), 2)
sheetName = Year(today) & "-" & Right("0" & Month(today), 2) & "-" & Right("0" & Day(today), 2)
monthFile = workDir & "值班记录_" & monthStr & ".xlsx"

' ============================================
' 【验证】检查必要文件和文件夹
' ============================================
If Not fso.FolderExists(workDir) Then
    ShowError "错误：工作目录不存在", workDir
    WScript.Quit
End If

If Not fso.FileExists(templateFile) Then
    ShowError "错误：模板文件不存在", templateFile
    WScript.Quit
End If

' ============================================
' 【启动】Excel 应用
' ============================================
On Error Resume Next
Set xlApp = CreateObject("Excel.Application")
If Err.Number <> 0 Then
    ShowError "错误：无法启动 Excel", Err.Description
    WScript.Quit
End If
On Error GoTo 0

xlApp.Visible = False
xlApp.DisplayAlerts = False

' ============================================
' 【创建】月度文件（如果不存在）
' ============================================
isNewFile = False
If Not fso.FileExists(monthFile) Then
    isNewFile = True
    fso.CopyFile templateFile, monthFile, False
    If Err.Number <> 0 Then
        ShowError "错误：复制模板失败", Err.Description
        xlApp.Quit
        WScript.Quit
    End If
End If

' ============================================
' 【关闭】如果目标文件已打开（不影响其他Excel文件）
' ============================================
CloseTargetWorkbook monthFile

' ============================================
' 【打开】Excel 工作簿
' ============================================
On Error Resume Next
Set xlBook = xlApp.Workbooks.Open(monthFile)
If Err.Number <> 0 Then
    ShowError "错误：无法打开文件", monthFile & vbCrLf & Err.Description
    xlApp.Quit
    WScript.Quit
End If
On Error GoTo 0

' ============================================
' 【锁定检查】自动锁定过期的工作表
' ============================================
CheckAndLockWorksheets

' ============================================
' 【创建】当日工作表（如果不存在）
' ============================================
CreateDailyWorksheet

' ============================================
' 【清理】释放资源
' ============================================
xlBook.Save
xlBook.Close
xlApp.Quit

Set xlBook = Nothing
Set xlApp = Nothing
Set fso = Nothing

MsgBox "成功！" & vbCrLf & _
       "文件：" & monthFile & vbCrLf & _
       "工作表：" & sheetName & vbCrLf & _
       "截止时间：" & DateValue(tomorrow) + TimeValue(DEADLINE_TIME), _
       vbInformation, "完成"

' ============================================
' 【子过程】关闭目标工作簿（如果已打开）
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
' 【子过程】显示错误信息
' ============================================
Sub ShowError(title, message)
    MsgBox title & vbCrLf & vbCrLf & message, vbCritical, "错误"
End Sub

' ============================================
' 【子过程】检查并锁定过期工作表
' ============================================
Sub CheckAndLockWorksheets()
    Dim ws, deadline
    For Each ws In xlBook.Worksheets
        If IsDateSheet(ws.Name) Then
            If ws.Range("Z1").Value <> "" And IsDate(ws.Range("Z1").Value) Then
                deadline = CDate(ws.Range("Z1").Value)
                If Now > deadline Then
                    ws.Protect LOCK_PASSWORD
                Else
                    ws.Unprotect LOCK_PASSWORD
                End If
            End If
        End If
    Next
End Sub

' ============================================
' 【函数】判断是否为日期格式工作表
' ============================================
Function IsDateSheet(sheetName)
    IsDateSheet = (Len(sheetName) = 10 And _
                   Mid(sheetName, 5, 1) = "-" And _
                   Mid(sheetName, 8, 1) = "-")
End Function

' ============================================
' 【子过程】创建每日工作表
' ============================================
Sub CreateDailyWorksheet()
    Dim ws, targetWs
    Dim wsExists : wsExists = False

    ' 检查工作表是否已存在
    For Each ws In xlBook.Worksheets
        If ws.Name = sheetName Then
            wsExists = True
            Set targetWs = ws
            Exit For
        End If
    Next

    If Not wsExists Then
        ' 创建新工作表
        On Error Resume Next
        xlBook.Worksheets(1).Copy xlBook.Worksheets(1)
        If Err.Number <> 0 Then
            ShowError "错误：复制工作表失败", Err.Description
            xlBook.Close False
            xlApp.Quit
            WScript.Quit
        End If
        On Error GoTo 0

        Set ws = xlBook.Worksheets(1)
        ws.Name = sheetName

        ' 解锁新工作表（防止复制时继承锁定状态）
        ws.Unprotect LOCK_PASSWORD

        ' 清空数据区域（只清6-16行，保留17-21行模板内容）
        ws.Range("A6:K16").ClearContents

        ' 重新添加时间公式（ClearContents会清除公式）
        ' 只添加前11行（6-16），与模板保持一致
        Dim i
        For i = 6 To 16
            ws.Range("B" & i).Formula = "=IF(C" & i & "="""","""",IF(B" & i & "="""",NOW(),B" & i & "))"
            ws.Range("J" & i).Formula = "=IF(K" & i & "="""","""",IF(J" & i & "="""",NOW(),J" & i & "))"
            ' 添加"时"字提示
            ws.Range("A" & i).Value = "时"
            ws.Range("I" & i).Value = "时"
        Next

        ' 填充数据
        FillWorksheetContent ws

        ' 删除模板工作表（仅限新文件）
        If isNewFile Then
            DeleteTemplateSheets
        End If
    Else
        ' 工作表已存在，检查截止时间
        If targetWs.Range("Z1").Value = "" Then
            targetWs.Range("Z1").Value = DateValue(tomorrow) + TimeValue(DEADLINE_TIME)
            targetWs.Range("Z1").Font.Color = RGB(255, 255, 255)
        End If
    End If
End Sub

' ============================================
' 【子过程】填充工作表内容
' ============================================
Sub FillWorksheetContent(ws)
    Dim dutyTime, handoverTime, deadlineTime
    Dim dutyPersonIndex, nextDutyPersonIndex
    Dim baseDate, daysDiff
    Dim titleText, yearMonthStart

    ' 计算截止时间
    deadlineTime = DateValue(tomorrow) + TimeValue(DEADLINE_TIME)

    ' ============================================
    ' 【可修改】值班轮换基准日期
    ' 格式：DateValue("YYYY-MM-DD")
    ' 说明：从这一天开始计算值班轮换周期
    ' 注意：必须是值班表开始的第一天
    ' ============================================
    baseDate = DateValue("2026-07-26")

    ' 计算值班人员索引
    daysDiff = DateDiff("d", baseDate, today)
    dutyPersonIndex = daysDiff Mod 5
    If dutyPersonIndex < 0 Then dutyPersonIndex = dutyPersonIndex + 5

    nextDutyPersonIndex = (daysDiff + 1) Mod 5
    If nextDutyPersonIndex < 0 Then nextDutyPersonIndex = nextDutyPersonIndex + 5

    ' 构建时间字符串
    dutyTime = "值班人员签字（手写）：" & dutyPersons(dutyPersonIndex) & _
               "    值班时间： " & Month(today) & " 月 " & Day(today) & " 日 8 时 30 分至 " & _
               Month(tomorrow) & " 月 " & Day(tomorrow) & " 日 8 时 30 分"

    handoverTime = "接班人员签字（手写）：" & dutyPersons(nextDutyPersonIndex) & _
                   "    交接时间： " & Month(tomorrow) & " 月 " & Day(tomorrow) & " 日 8 时 30 分"

    ' 填写标题
    titleText = STATION_NAME & Year(today) & "年" & Month(today) & "月份值班记录"
    ws.Range("A1").Value = titleText

    ' 设置红色字体
    yearMonthStart = Len(STATION_NAME) + 1
    ws.Range("A1").Characters(yearMonthStart, Len(Year(today) & "年" & Month(today) & "月份")).Font.Color = RGB(255, 0, 0)

    ' 填写内容和截止时间
    ws.Range("A2").Value = dutyTime
    ws.Range("A3").Value = handoverTime
    ws.Range("A4").Value = "天气情况："
    ws.Range("Z1").Value = deadlineTime
    ws.Range("Z1").Font.Color = RGB(255, 255, 255)

    ' 删除所有已存在的复选框，不添加任何新复选框
    Dim cbCount
    cbCount = ws.CheckBoxes.Count
    Dim k
    For k = cbCount To 1 Step -1
        ws.CheckBoxes(k).Delete
    Next
End Sub

' ============================================
' 【子过程】删除模板工作表
' ============================================
Sub DeleteTemplateSheets()
    On Error Resume Next
    If xlBook.Worksheets.Count >= 3 Then
        xlBook.Worksheets(3).Delete
    End If
    If xlBook.Worksheets.Count >= 2 Then
        xlBook.Worksheets(2).Delete
    End If
    On Error GoTo 0
End Sub
