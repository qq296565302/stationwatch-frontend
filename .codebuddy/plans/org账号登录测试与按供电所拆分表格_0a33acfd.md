---
name: org账号登录测试与按供电所拆分表格
overview: 对 org-accounts.xlsx 中的 1484 个组织账号随机抽取 30 个通过后端 HTTP 接口做登录测试（校验账号/密码/姓名/所属供电所），测试通过后按供电所拆分表格（每供电所一个 xlsx），所有区县管理员账号单独汇总为一个 xlsx。
todos:
  - id: login-test-script
    content: 编写 Python 登录测试脚本，读取 org-accounts.xlsx 并分层随机抽样 30 个账号
    status: completed
  - id: run-login-test
    content: 执行 30 账号登录测试，校验账号/密码/姓名/供电所并生成测试报告
    status: completed
    dependencies:
      - login-test-script
  - id: split-accounts
    content: 编写并运行拆分脚本，按供电所拆分账号表并单独汇总区县管理员表
    status: completed
    dependencies:
      - run-login-test
  - id: verify-outputs
    content: 核对拆分结果账号总数与源表一致并确认报告与输出文件
    status: completed
    dependencies:
      - split-accounts
---

## 产品概述
对供电所值守云平台的组织账号体系执行验证与整理，包括两部分工作：登录可用性验证和账号表格拆分，确保已灌库的 1484 个组织账号可正常登录且归属信息正确，并产出便于分发的账号清单文件。

## 核心功能
1. **登录测试**：从 org-accounts.xlsx 随机抽取 30 个账号，通过后端登录接口逐一登录，校验账号、密码、用户姓名、所属供电所与表格记录一致，输出测试报告。
2. **表格拆分**：测试通过后，按供电所将账号清单拆分为若干表格（每个供电所一个文件，含该所所长与值班员账号），所有区县管理员账号单独汇总为一个表格。

## 补充约束
- 账号已灌库、后端运行中，登录测试可直接执行。
- 拆分仅生成新文件，不改动原 xlsx 与数据库。
- 不需要单独删除旧账号。

## 技术栈
- 脚本语言：Python（openpyxl 读写 xlsx；HTTP 用标准库 urllib，避免依赖未确认安装的 requests）
- 数据源：`backend/scripts-output/org-accounts.xlsx`
- 登录接口：`POST /api/v1/auth/login`（http://localhost:3000）

## 实现方案
### 1. 登录测试脚本（login-test）
- 用 openpyxl 读取 xlsx，解析 1484 行（含区县管理员/所长/值班员）。
- **分层随机抽样 30 个账号**：按角色分组（区县管理员、所长、值班员），在各组内随机抽取，保证三类角色都有覆盖；再按供电所适当分散，避免集中在同一所。抽样固定随机种子，保证可复现。
- 对每个抽样账号调用 `POST /api/v1/auth/login`，请求体 `{ username, password }`，password 取自「默认密码」列。
- 断言：
  - 响应 `code === 0` 且 `data.user` 存在（登录成功）
  - 返回的 `user.realName` 与 xlsx「姓名」列一致
  - 返回的 `user.stationName` 与 xlsx「供电所」列一致（区县管理员 stationName 应为空或对应 null，单独处理）
- 输出测试报告（控制台 + 写文件）：抽样清单、每条通过/失败、失败时列出账号/预期值/实际值/错误信息，最后汇总通过率。
- 报告输出到 `backend/scripts-output/login-test-report.txt` 或 `.json`。

### 2. 表格拆分脚本（split-accounts）
- 用 openpyxl 读取 xlsx，按「供电所」列分组：
  - 供电所非空的行（所长 supervisor + 值班员 duty_officer）→ 按供电所分组，每组生成一个 xlsx，命名如 `{供电所}账号.xlsx`。
  - 供电所为空的行（区县管理员）→ 汇总为一个 `区县管理员账号.xlsx`。
- 每个拆分表格**保留原始列结构**（序号/区县/供电所/角色/姓名/用户名/默认密码），序号按组内重新编排（从 1 开始）。
- 输出目录 `backend/scripts-output/split/`。

### 性能与可靠性
- 30 次登录为低频只读操作，串行执行即可；每次请求加超时（如 15s）避免阻塞。
- 抽样与拆分均为一次性工具脚本，逻辑简单、无额外依赖，放在 `backend/scripts/` 或临时目录，执行后可保留（便于复用）或清理。
- 失败处理：单条失败不中断整体，继续测试其余账号，最后汇总。

## 实施细节
- Python 写 HTTP 请求用标准库 `urllib.request`，构造 JSON 请求体，解析 JSON 响应，避免依赖 requests。
- 供电所列表、区县列表由脚本运行时从 xlsx 读取，不硬编码。
- 拆分后核对各文件账号数之和 + 区县管理员数 = 1484，防止丢行。

## 目录结构
```
backend/
└── scripts-output/
    ├── org-accounts.xlsx          # 源文件（只读）
    ├── login-test-report.txt      # [NEW] 30 账号登录测试报告
    └── split/                     # [NEW] 拆分输出目录
        ├── 区县管理员账号.xlsx     # 所有区县管理员汇总
        ├── 索镇供电所账号.xlsx     # 每供电所一个（示例）
        ├── 起凤供电所账号.xlsx
        └── ...
```

## 架构
无既有系统架构改动，仅新增一次性运维脚本与产出文件，不影响前端/后端运行时。
