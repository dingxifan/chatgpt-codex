# Central Workspace Routing Table

Schema version: 1

## Runtime authority

The sole runtime routing authority is repository `dingxifan/chatgpt-codex`, branch `main`, path `config/CODEX_WORKSPACE_ROUTING.md`.

Canonical URL: https://raw.githubusercontent.com/dingxifan/chatgpt-codex/main/config/CODEX_WORKSPACE_ROUTING.md

Read the complete current contents from this URL for every new dispatch before any artifact persistence or `codex_start`. Never reuse a previous read or cached table. All `CODEX_WORKSPACE_ROUTING.md` copies in GPT Project / Space are non-authoritative; codex-dispatch must not read routing tables from Project Files. Memory, historical dispatches, local copies and other repository copies are not fallback sources. If the canonical URL cannot be read completely or the table is invalid, stop with `WORKSPACE_ROUTING_TABLE_UNAVAILABLE`.

Resolve routes by exact supplied repository/workspace values under the Skill's preflight rules. Computer and Bridge namespace come only from this table. Do not infer a route from history, machine names, drive letters, path style, client identity or Bridge availability. Do not fall back to another route or Bridge. Freeze the selected route and actual tool handles for the entire handoff.

### Optional publication scope (Schema 1)

Execution routing still uses the six existing required fields. A route may additionally contain two nonempty inline fields: `Publish targets` and `Publish order`. Copy both selected-route values unchanged into Task Payload, not into the canonical envelope fields. They describe publication scope, not execution routing or permission to push, merge or deploy; the current human task determines authorized actions.

`Publish targets` is a list of final-delivery repository-address/branch pairs: `address => refs/heads/branch`, separated by ` | `. Each address is a credential-free HTTPS or SSH Git repository address (including SSH scp-style addresses); each branch is a valid full branch ref. Do not detach a branch from its address. `Publish order` describes the primary platform, PR/merge gates and synchronization sequence for those targets; for a single target it states that target's existing publication flow. When that order calls for a task-branch push/PR, the same listed repository address may receive the task branch as an intermediate step if the human authorizes it; this does not authorize the final merge or add another publication repository. Duplicate/conflicting pairs, empty/missing halves, a present-but-empty field, an unsupported address/ref or an incomplete/contradictory order are configuration errors. Report them; do not silently use fallback. Older Skills may ignore these optional fields without changing Schema 1 route selection.

Only when BOTH optional fields are absent in the successfully read selected route does the workspace-Git fallback apply: if this task requests publication/synchronization, the receiver inspects the one selected Git repository, every configured remote and all effective push addresses, and synchronizes this task's intended delivery branch(es) to every such publication target under the task's authority and existing PR gates. This is the user's full-sync fallback, not a default `origin`-only push. No Git repository, multiple independent repositories, no push addresses, or an unresolved delivery branch/merge sequence needs clarification; do not guess a cross-repository scope. No additional Project Files lookup is introduced. A failed/incomplete central read is NEVER an absent optional field.

For either scope, compare intended targets against actual remotes and all push addresses before writing. A mismatch must not redirect a push or add an unexpected destination. An explicit target set may be a subset of configured push addresses: verify each listed address against the effective configuration, but do not add the other addresses. Fallback covers ALL effective addresses. Unresolvable push-address discovery is a blocker, not an address to silently skip; do not disclose embedded credentials. Push and verify each validated address/ref explicitly; do not push by a remote alias when its multiple push URLs would fan out to unselected addresses. Push/merge authorization remains task-specific. Synchronize only the intended delivery refs, not all local branches/tags; do not use `push --mirror`, automatically force, create remotes/credentials or rewrite remote configuration. For equal commit IDs across platforms, synchronize the explicitly chosen primary platform's verified merge result; do not independently merge each platform. Respect divergence and write restrictions, and report success/failure/pending verification separately for each target. Verify the actual remote refs against the intended final SHA (not local tracking refs). Only all required verified targets justify “fully synchronized”; one target's success is not overall success. Report authorized intermediate branch/PR completion separately from final-branch synchronization awaiting merge authority.

## Route 1

Route ID: codex-from-chatgpt
Repository: dingxifan/chatgpt-codex
Workspace: E:\tools\codex-from-chatgpt
Computer: DESKTOP_6CNV6UL
Bridge namespace: Codex_Bridge___DESKTOP_6CNV6UL
Status: active
Publish targets: https://github.com/dingxifan/chatgpt-codex.git => refs/heads/main
Publish order: GitHub is primary. Push the task branch and open/update a draft PR targeting main; review and merge only when the human authorizes that step. Verify the resulting GitHub main SHA. No additional publication target is configured.

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
Computer: LAPTOP-H80BPPA5
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
