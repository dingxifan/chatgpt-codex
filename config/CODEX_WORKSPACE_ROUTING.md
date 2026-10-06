# Central Workspace Routing Table

Schema version: 1

## Runtime authority

The sole runtime routing authority is repository `dingxifan/chatgpt-codex`, branch `main`, path `config/CODEX_WORKSPACE_ROUTING.md`.

Canonical URL: https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md

Read the complete current contents from this URL for every new dispatch before any artifact persistence or `codex_start`. Never reuse a previous read or cached table. All `CODEX_WORKSPACE_ROUTING.md` copies in GPT Project / Space are non-authoritative; codex-dispatch must not read routing tables from Project Files. Memory, historical dispatches, local copies and other repository copies are not fallback sources. If the canonical URL cannot be read completely or the table is invalid, stop with `WORKSPACE_ROUTING_TABLE_UNAVAILABLE`.

Resolve routes by exact supplied repository/workspace values under the Skill's preflight rules. Computer and Bridge namespace come only from this table. Do not infer a route from history, machine names, drive letters, path style, client identity or Bridge availability. Do not fall back to another route or Bridge. Freeze the selected route and actual tool handles for the entire handoff.

## Route 1

Route ID: codex-from-chatgpt
Repository: dingxifan/chatgpt-codex
Workspace: E:\tools\codex-from-chatgpt
Computer: DESKTOP_6CNV6UL
Bridge namespace: Codex_Bridge___DESKTOP_6CNV6UL
Status: active

Keep the existing Route ID to preserve its associations; the maintained repository is `dingxifan/chatgpt-codex`.

## Route 2

Route ID: file-extract
Repository: dingxifan/file-extract
Workspace: E:\projects\file-extract
Computer: DESKTOP_6CNV6UL
Bridge namespace: Codex_Bridge___DESKTOP_6CNV6UL
Status: active

## Route 3

Route ID: feishu-collection
Repository: dingxifan/feishu-collection
Workspace: D:\Program Files (x86)\飞书信息的导出
Computer: LAPTOP-H80BPPA5
Bridge namespace: Codex_Bridge___LAPTOP_H80BPPA5
Status: active

Enabled on 2026-10-06 at the user's request to configure known local project routes. The Laptop desktop project list exposes this exact workspace; its Git origin is https://github.com/dingxifan/feishu-collection.git. The current tool catalog identifies the Codex Bridge - LAPTOP-H80BPPA5 connector and its normalized Laptop namespace, including artifact_put and codex_start.

## Route 4

Route ID: auchi-laptop
Repository: dingxifan/Auchi
Workspace: D:\development\auchi-shadow
Computer: LAPTOP_H80BPPA5
Bridge namespace: Codex_Bridge___LAPTOP_H80BPPA5
Status: active

The Laptop desktop project list exposes this exact workspace. Its Git remote named github is https://github.com/dingxifan/Auchi.git; the separate Gitee origin does not replace this verified GitHub repository identity. Enabled under the same explicit request to configure known Laptop routes.

## Route 5

Route ID: mail-ai
Repository: dingxifan/mail-ai
Workspace: E:\projects\mail-ai
Computer: DESKTOP_6CNV6UL
Bridge namespace: Codex_Bridge___DESKTOP_6CNV6UL
Status: active

Enabled at the user's request for the local mail-ai workspace. The route uses the same verified DESKTOP bridge namespace as the other configured E:\projects workspace on this computer.


## Route 6

Route ID: hact-method
Repository: dingxifan/hact-method
Workspace: E:\projects\hact-method
Computer: DESKTOP_6CNV6UL
Bridge namespace: Codex_Bridge___DESKTOP_6CNV6UL
Status: active

Enabled from direct Codex execution evidence on DESKTOP_6CNV6UL showing the adopted Method repository at this exact workspace; this route supports Method maintenance dispatches without inferring from drive-letter style.
