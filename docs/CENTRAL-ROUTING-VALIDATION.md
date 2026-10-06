# 中央路由迁移验证

2026-10-06 路径核对：当前唯一维护目录为 `E:\tools\codex-from-chatgpt`，见 [Desktop 环境基线](ENVIRONMENT-BASELINE-DESKTOP-6CNV6UL.md)。中央表 Route 1 已由 [PR #4](https://github.com/dingxifan/chatgpt-codex/pull/4) 更正并合并。下文是 2026-10-05 的迁移证据；旧目录、当时的 route 数量及 disabled 状态仅属历史，不用于当前路由或命令。

日期：2026-10-05，America/New_York。范围：唯一 GitHub 中央路由配置与 codex-dispatch v0.1.14；不修改 Bridge 接口，不新增 parser、服务、缓存或生命周期设施。

## Git 基线与版本

- 当时维护目录（已停用）：`E:\tools\codex-dispatch-kit`；当时 origin fetch/push 均为 `https://github.com/dingxifan/chatgpt-codex.git`。
- 开始时 HEAD：`60da79c19c2131583200fdd3292c130aed2cef94`；`git status --short` 为空。
- fetch 后 origin/main：`ea2f882a1f4aecddfdc03f0439b3149139d0f57c`。
- 本地已有两个独有提交（`687e69c`、`60da79c`）；远端独有提交为 Laptop 安装记录。正常 merge，无冲突，保留全部历史；未 reset、clean 或改上游仓库。
- 本地插件已是 v0.1.13，因此升级为 v0.1.14，未降到方案中的 v0.1.11。

## 验证结果

| 检查 | 结果与证据边界 |
| --- | --- |
| 中央表内容 | PASS：Schema version 1；三个完整 route 的六个字段逐项与任务要求精确一致；两个 Desktop route active，Laptop route disabled |
| Skill 权威源 | PASS：固定 canonical raw URL、每次新派发完整重新读取、忽略 Project Files 副本；旧 Project Files 能力要求和多 authoritative files 分支已移除 |
| 中央读取失败 | PASS（规则审查）：WORKSPACE_ROUTING_TABLE_UNAVAILABLE 覆盖缺失、不可读、非法 schema、字段、路径、status 和解析失败；artifact/codex_start 前停止，无副本 fallback |
| file-extract | PASS（表内容与规则审查）：只有一个 active repository match，精确解析为 E:\projects\file-extract / DESKTOP_6CNV6UL / Codex_Bridge___DESKTOP_6CNV6UL |
| feishu-collection | PASS（表内容与规则审查）：disabled，匹配也返回 WORKSPACE_ROUTE_NOT_FOUND，不派发 |
| ambiguity | PASS（规则审查）：duplicate ID、duplicate exact workspace、多个 active repository match 均为 WORKSPACE_ROUTE_AMBIGUOUS；不选择 first/newest/online |
| workspace mismatch | PASS（规则审查）：完整精确匹配，repository/workspace 冲突或路径差异返回 WORKSPACE_ROUTE_NOT_FOUND |
| Bridge unavailable | PASS（规则审查）：仅检查选中 namespace 的必要工具，缺失即 WORKSPACE_BRIDGE_UNAVAILABLE，不尝试其它电脑 |
| Frozen route | PASS（规则审查）：冻结 route、repository、absolute workspace、computer、namespace、actual tool handles；artifact_put/codex_start 使用同一 Bridge |
| Typecheck | PASS：npm run typecheck |
| 源码测试 | 首次 FAIL：41/44；缺少 CODEX_WORKSPACE_ROOT 与 Windows TEMP 短路径导致三项失败。按 INSTALL.md 设置 CODEX_WORKSPACE_ROOT、TEMP、TMP 后重跑 PASS：44/44；未修改测试或 Bridge 源码 |
| Build | PASS：npm run build |
| 安装包装检查 | PASS：scripts/Test-Install.ps1；脚本语法、既有配置保留、Skill 内容一致、冲突拒绝、更新备份、缺少桌面上下文拒绝 |
| Plugin 打包 | PASS：scripts/Pack-Plugin.ps1；ZIP 三个文件与源文件逐字节一致，包含隐藏 compatibility manifest；两个 manifest 身份、v0.1.14 与 interface 一致；subtitle 长度合规 |
| 实际 ChatGPT dispatch / 错误分支运行 | NOT_RUN：上述 routing 分支为 Skill 文本审查和静态内容校验，不声称模型运行或端到端证明；没有调用 artifact_put、codex_start 或 codex_get |
| ChatGPT 账号插件更新 / 当前工具目录 | NOT_RUN：需账号端导入新版 ZIP、新会话核验；若连接实际定义仍旧，按 CONNECT-CHATGPT.md Refresh tools。Skill 更新与工具刷新是不同步骤 |

插件产物：`out/codex-dispatch-v0.1.14.zip`（Git 忽略）。SHA-256：`ba147988d8fce1eaee46137a0fee55d0af1ef5cdb3c5c8f21aff1983d1bb1ff6`。

提交并 push 后，应通过 canonical raw URL 实际 GET 并与本地中央表摘要核对，再核对远端 main 的 RESULT_SHA；此文件不预先声称发布后验证已通过。最终聊天交付报告该检查的实际结果。
