# woqso.com Implementation Plan

## Objective

Build a cross-platform desktop inspector for DWP/GC workflow state in Git repositories using Electron, React, electron-vite, and Zustand.

The implementation should stay protocol-faithful for DWP/GC facts while clearly separating app-derived diagnostics and Git inspection features.

---

## Delivery principles

- Keep Git as the only source of truth.
- Keep all shell execution in the main process.
- Treat DWP/GC protocol facts, Git inspection features, and UI diagnostics as separate layers.
- Prefer batched Git reads over per-branch subprocesses.
- Preserve raw evidence and expose it in the UI.
- Keep v1 read-only except for explicit remote fetch.

---

## Milestone 0: Project bootstrap

Ticket: [`tickets/1-bootstrap-app-shell.md`](tickets/1-bootstrap-app-shell.md)

### Goals

- Create the Electron app shell.
- Set up React renderer and Zustand stores.
- Wire preload and IPC skeleton.
- Establish folder structure from `SPEC.md`.

### Tasks

- Initialize project with `electron-vite` in JavaScript.
- Create directories:
  - `src/main`
  - `src/main/ipc`
  - `src/main/services`
  - `src/preload`
  - `src/renderer/app`
  - `src/renderer/stores`
  - `src/renderer/components`
- Configure Electron security defaults:
  - `contextIsolation: true`
  - `nodeIntegration: false`
- Add placeholder app window and preload bridge.
- Add basic renderer layout with left / center / right regions.

### Deliverable

- App launches with a visible shell and no direct renderer access to Node APIs.

---

## Milestone 1: Git execution layer

Ticket: [`tickets/2-build-git-execution-layer.md`](tickets/2-build-git-execution-layer.md)

### Goals

- Implement safe Git command execution.
- Standardize success/error handling.
- Validate repositories.

### Tasks

- Build `src/main/services/git.js`.
- Implement a command wrapper around `execFile` or `spawn` with:
  - `cwd: repoPath`
  - timeout support
  - captured `stdout` / `stderr`
  - structured error objects
- Add explicit repo path and ref name sanitization before command execution.
- Implement repo validation:
  - `git rev-parse --is-inside-work-tree`
- Implement current branch lookup.
- Implement remote listing.
- Implement local branch listing with upstream metadata using batched `for-each-ref`.
- Implement ahead/behind queries against upstream refs.
- Define a small internal Git result model so higher layers never parse raw process errors directly.

### Deliverable

- Main process can validate a repo and return basic branch/remote facts safely.

---

## Milestone 2: Commit parser and DWP extraction

Ticket: [`tickets/3-implement-commit-parser.md`](tickets/3-implement-commit-parser.md)

### Goals

- Parse commit messages safely.
- Extract DWP metadata from the final trailer block only.
- Preserve raw commit evidence.

### Tasks

- Build `src/main/services/parser.js`.
- Parse commit message into:
  - `hash`
  - `shortHash`
  - `title`
  - `body`
  - `rawMessage`
  - `trailers`
  - `stableTrailers`
  - `dwpState`
  - `parseStatus`
  - `actionable`
- Ensure `stableTrailers` preserves original key casing exactly as parsed while normalizing only value structure for repeated trailers and stable UI access.
- Enforce DWP/GC parsing rules:
  - trailing trailer block only
  - case-sensitive keys
  - `dwp-state` last-wins
  - repeated trailers preserved
- Match Git trailer behavior as closely as practical, ideally compatible with `git interpret-trailers`.
- Preserve raw commit message and any successfully parsed fields when parsing is partial.
- Recognize reserved working-lease keys:
  - `dwp-origin-state`
  - `dwp-run-id`
  - `dwp-runner-id`
  - `dwp-lease-seconds`
- Recognize optional standardized metadata:
  - `dwp-source`
  - `dwp-log-level`

### Deliverable

- Parser returns protocol-faithful commit metadata plus app diagnostics.

---

## Milestone 3: DWP domain derivation

Ticket: [`tickets/4-add-dwp-derivation.md`](tickets/4-add-dwp-derivation.md)

### Goals

- Convert raw Git and parsed commit facts into UI-ready branch state.
- Keep protocol facts separate from app heuristics.

### Tasks

- Build `src/main/services/dwp.js`.
- Derive:
  - `localState`
  - `remoteState`
  - `effectiveState` as app-derived only, using the strict v1 rule from `SPEC.md`
  - `syncStatus`
  - `warnings`
  - `lease` diagnostics
- Implement protocol-level non-actionable handling:
  - missing canonical `dwp-state`
  - failed trailer parsing
- Implement UI diagnostics distinctly:
  - `unknown` for missing canonical `dwp-state`
  - `parse-error` for partial or failed trailer parsing
- Implement app-level lease heuristic for `working`:
  - use `committerDate`
  - use `dwp-lease-seconds` when present
  - output `active | expired | unknown | n/a`
- Ensure no business semantics are inferred for arbitrary `dwp-state` values.

### Deliverable

- A pure DWP service that produces deterministic derived output for UI rendering.

---

## Milestone 4: Repo snapshot composition

Ticket: [`tickets/5-compose-repo-snapshots.md`](tickets/5-compose-repo-snapshots.md)

### Goals

- Produce the main `RepoSnapshot` shape from batched Git facts.
- Support branch overview and branch detail screens.

### Tasks

- Build `src/main/services/repoSnapshot.js`.
- Compose:
  - repo metadata including `generatedAt` as ISO 8601 UTC
  - `currentBranch`
  - remotes
  - branches
  - local head commit details
  - upstream head commit details
  - DWP derived workflow data
- Ensure `CommitDetails` includes full spec fields:
  - `hash`
  - `shortHash`
  - `author`
  - `authorEmail`
  - `authorDate`
  - `committer`
  - `committerEmail`
  - `committerDate`
  - `title`
  - `body`
  - `rawMessage`
  - `trailers`
  - `stableTrailers`
  - `dwpState`
  - `parseStatus`
  - `actionable`
- Ensure `BranchDetails` and `RepoSnapshot` include required spec fields such as `comparedRemoteName`, `diverged`, `rawEvidence`, and ISO UTC serialized dates.
- Add explicit branch-detail logic to collect `recentDwpCommits` by scanning the latest N commits on the selected ref and keeping only commits whose final trailer block contains at least one `dwp-*` trailer.
- Keep `recentDwpCommits` bounded to the configured last N commits.
- Preserve raw commit message and partial parsed fields in snapshot and detail payloads when parse status is `partial`.
- Implement batched strategy:
  - `for-each-ref` for local branches and upstream refs
  - minimal `log` calls for needed commit metadata
  - minimal `rev-list` calls for ahead/behind
- Distinguish:
  - upstream comparison facts
  - selected remote browsing state
- For selected-remote browsing in v1, load and show remote branch refs for the chosen remote so branches without upstream can still be inspected against that remote's visible branch list without synthesizing ahead/behind state.
- Build helpers for:
  - `RepoSnapshot`
  - `BranchDetails`
  - `CommitDetails`

### Deliverable

- Main process can return `loadRepoSnapshot`, `getBranchDetails`, and `getCommitDetails` payloads matching the spec.

---

## Milestone 5: IPC and preload contract

Ticket: [`tickets/6-wire-ipc-and-preload.md`](tickets/6-wire-ipc-and-preload.md)

### Goals

- Expose a narrow renderer API.
- Keep command shapes explicit and safe.

### Tasks

- Build `src/main/ipc/repo.js`.
- Register channels:
  - `repo:select`
  - `repo:loadSnapshot`
  - `repo:getBranchDetails`
  - `repo:getCommitDetails`
  - `repo:fetchRemote`
- Build `src/preload/index.js` exposing:
  - `window.woqso.selectRepo`
  - `window.woqso.loadRepoSnapshot`
  - `window.woqso.getBranchDetails`
  - `window.woqso.getCommitDetails`
  - `window.woqso.fetchRemote`
- Add minimal argument validation.
- Ensure renderer never passes arbitrary shell commands or untrusted argument shapes.

### Deliverable

- Renderer can load repo data only through explicit IPC methods.

---

## Milestone 6: Renderer state and data flow

Ticket: [`tickets/7-build-renderer-stores.md`](tickets/7-build-renderer-stores.md)

### Goals

- Implement Zustand stores and refresh lifecycle.
- Support repo selection, branch selection, and commit selection.

### Tasks

- Build `src/renderer/stores/ui.js`.
- Build `src/renderer/stores/repo.js`.
- Default the selected remote to `origin` when present, otherwise the first available remote, and persist later user overrides per repo.
- Track full UI store fields from `SPEC.md`, including `selectedView` and `refreshIntervalMs`.
- Implement actions for:
  - selecting repo
  - loading snapshot
  - refreshing snapshot
  - selecting branch
  - selecting commit
  - selecting remote
  - toggling auto-refresh
- Track:
  - `isRefreshing`
  - `error`
  - `lastRefreshedAt`
- Add auto-refresh timer management in renderer with explicit cleanup.
- Keep remote fetch separate from normal refresh.

### Deliverable

- Renderer can navigate repository state and refresh data predictably.

---

## Milestone 7: Core UI screens

Ticket: [`tickets/8-build-core-ui.md`](tickets/8-build-core-ui.md)

### Goals

- Build the primary inspector UI.
- Surface both high-level state and raw evidence.

### Tasks

- Build `RepoPicker.jsx`.
- Build `Toolbar.jsx` with refresh, fetch, and auto-refresh controls.
- Build `RemotePanel.jsx`.
- Show browsable remote branch refs for the selected remote in `RemotePanel.jsx`.
- Build `BranchList.jsx`.
- Build `BranchStatusBadge.jsx`.
- Build `BranchDetail.jsx`.
- Build `CommitDetail.jsx`.
- Build `ErrorBanner.jsx`.
- Show in branch rows:
  - branch name
  - current marker
  - upstream or no upstream
  - ahead/behind summary
  - `dwp-state`
  - warning markers
  - lease marker when applicable
- Ensure badges and diagnostics explicitly cover:
  - `unknown`
  - `parse-error`
  - `no upstream`
  - `diverged`
  - lease statuses
- Show in details:
  - local vs upstream commit comparison
  - protocol facts
  - app-derived diagnostics
  - recognized DWP metadata including reserved working-lease keys and optional standardized metadata
  - raw trailers
  - raw commit message
  - parse warnings

### Deliverable

- A usable single-window inspector with overview, branch detail, and commit detail panels.

---

## Milestone 8: Persistence and convenience

Ticket: [`tickets/9-add-persistence-and-fetch-ux.md`](tickets/9-add-persistence-and-fetch-ux.md)

### Goals

- Save local UI preferences without caching repo truth.

### Tasks

- Persist recent repositories.
- Persist selected remote per repo.
- Persist auto-refresh preference.
- Persist panel widths if implementation is easy.
- Restore last-used convenience settings at startup.

### Deliverable

- App remembers user context across launches.

---

## Milestone 9: Fetch and error UX

Ticket: [`tickets/9-add-persistence-and-fetch-ux.md`](tickets/9-add-persistence-and-fetch-ux.md)

### Goals

- Make remote interaction explicit and understandable.
- Provide resilient failure states.

### Tasks

- Implement `fetchRemote` in main process.
- Surface remote fetch status and errors clearly.
- Differentiate these error classes in UI:
  - invalid repo
  - not a repo
  - git missing
  - timeout
  - inaccessible remote
  - parse failure
- Show stale remote-tracking facts without implying freshness.
- Ensure one bad branch or commit does not break the whole snapshot UI.

### Deliverable

- Robust refresh and fetch flows with understandable diagnostics.

---

## Milestone 10: Testing

Ticket: [`tickets/10-add-tests-and-polish.md`](tickets/10-add-tests-and-polish.md)

### Goals

- Lock down protocol handling and snapshot composition.

### Tasks

- Add parser tests for:
  - multiline bodies
  - repeated trailers
  - mixed-case trailer keys
  - missing `dwp-state`
  - invalid trailer block
  - partial parse recovery
- Add DWP derivation tests for:
  - actionable vs non-actionable commits
  - `effectiveState`
  - `unknown` vs `parse-error` UI diagnostics
  - working lease diagnostics
  - upstream mismatch cases
- Add repo snapshot tests for:
  - many branches
  - branches without upstreams
  - stale remote-tracking refs
  - partial parse failures
- Add lightweight UI smoke coverage if practical.

### Deliverable

- Confidence that protocol-sensitive behavior is stable.

---

## Suggested execution order

1. Bootstrap app shell.
2. Implement Git service.
3. Implement parser.
4. Implement DWP derivation.
5. Implement snapshot composition.
6. Implement IPC and preload.
7. Implement stores.
8. Build core UI.
9. Add fetch and persistence.
10. Add tests and polish.

### Sequential tickets

1. [`tickets/1-bootstrap-app-shell.md`](tickets/1-bootstrap-app-shell.md)
2. [`tickets/2-build-git-execution-layer.md`](tickets/2-build-git-execution-layer.md)
3. [`tickets/3-implement-commit-parser.md`](tickets/3-implement-commit-parser.md)
4. [`tickets/4-add-dwp-derivation.md`](tickets/4-add-dwp-derivation.md)
5. [`tickets/5-compose-repo-snapshots.md`](tickets/5-compose-repo-snapshots.md)
6. [`tickets/6-wire-ipc-and-preload.md`](tickets/6-wire-ipc-and-preload.md)
7. [`tickets/7-build-renderer-stores.md`](tickets/7-build-renderer-stores.md)
8. [`tickets/8-build-core-ui.md`](tickets/8-build-core-ui.md)
9. [`tickets/9-add-persistence-and-fetch-ux.md`](tickets/9-add-persistence-and-fetch-ux.md)
10. [`tickets/10-add-tests-and-polish.md`](tickets/10-add-tests-and-polish.md)

---

## Risks to manage early

- Trailer parsing drift from Git behavior.
- Slow repo loading if commands are not batched.
- Confusing UI if app diagnostics are presented as protocol truth.
- Stale remote-tracking refs being mistaken for live remote state.
- Lease freshness heuristic being over-trusted by users.

---

## Definition of done for v1

- User can select a local Git repo and load a snapshot.
- App shows branches, remotes, upstreams, and ahead/behind facts.
- App shows canonical `dwp-state` from `HEAD` and preserves raw trailers.
- App distinguishes protocol facts from app-derived diagnostics.
- App surfaces `working` lease-related metadata when present.
- App handles missing or invalid protocol input as non-actionable.
- App supports explicit remote fetch.
- App remains read-only apart from fetch.
- Core parsing and derivation logic is covered by tests.
