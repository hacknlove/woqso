# woqso.com

## Summary

A cross-platform desktop GUI for inspecting the state of DWP-based workflows in Git repositories.

The app lets the user select a local repository, inspect branches and remotes, and understand the current workflow state derived from Git data only. It does not talk to any HTTP API. All data is obtained by executing Git CLI commands in the selected repository.

## Goals

- Provide a clear visual overview of DWP workflow state across branches.
- Show local and remote branch status side by side.
- Parse and display `dwp-*` commit trailers from relevant commits.
- Help users understand whether a branch is in sync, ahead, behind, diverged, missing upstream, or currently in `working` lease state.
- Make repo state inspection fast and trustworthy.
- Keep the implementation simple, local-first, and Git-native.

## Non-goals

- No workflow editing in v1.
- No commit creation, rebasing, or branch mutation in v1.
- No background daemon.
- No API/backend.
- No multi-window complexity in v1.
- No graph visualization unless trivial after core UX works.

## Primary user

A developer/operator working with DWP-enabled repositories who wants to inspect workflow state visually instead of reading raw Git output.

## Core use cases

1. Select a local Git repository folder.
2. See all local branches and their upstream/remotes.
3. See the current `dwp-state` for each branch.
4. Compare local vs remote branch state.
5. Inspect the latest relevant commit:
   - hash
   - title
   - body/payload
   - trailers
   - author
   - committer date
6. Detect whether the branch is:
   - in sync
   - ahead
   - behind
   - diverged
   - missing upstream
   - `working` with lease active/expired/unknown
7. Refresh manually.
8. Optionally enable lightweight auto-refresh.

## UX principles

- Git is the source of truth.
- Show derived state, but always expose the raw underlying Git facts.
- Do not hide ambiguity.
- Prefer explicit labels over decorative visuals.
- Fast inspection over pretty dashboards.
- Treat `dwp-state` as open-ended workflow data, not a closed enum.

---

## Functional requirements

### Definitions

- `latest relevant commit` means the selected ref's `HEAD` commit.
- `recent DWP-related commits` is a product-level navigation heuristic: the most recent N commits on the selected ref whose final parsed trailer block contains at least one `dwp-*` trailer.
- `unknown` is a UI-derived diagnostic label meaning canonical `dwp-state` is absent on the parsed `HEAD` commit; it is not a protocol state.
- `parse-error` is a UI diagnostic meaning commit metadata could be read from Git but trailer parsing failed partially or fully; it is not part of the DWP/GC protocol.

### Repository selection

- User can choose a local folder.
- App validates whether it is a Git repository.
- App remembers recent repositories locally.

### Branch overview

- Show all local branches.
- Show current checked-out branch.
- Show configured upstream for each branch if present.
- Show ahead/behind counts against upstream when available.
- Show whether local and upstream HEAD match.

### Remote overview

- Show all remotes.
- Allow selecting a default remote for comparison, defaulting to `origin` if present.
- Show remote URLs.
- For branch comparison, use the configured upstream when present.
- If a branch has no upstream, the selected remote may be used only for browsing that remote's branches, not for synthesizing ahead/behind comparison in v1.

### DWP workflow status

For each branch, derive and show:

- current HEAD commit
- parsed `dwp-*` trailers from HEAD
- inferred `dwp-state`
- recognized standardized DWP metadata such as `dwp-source` and `dwp-log-level` when present
- whether the state differs between local and upstream HEAD
- whether the branch has no upstream
- lease/liveness information when `dwp-state: working`

### Branch detail view

For a selected branch, show:

- local HEAD commit info
- upstream HEAD commit info if present
- whether branch is ahead/behind/diverged
- parsed trailers for local HEAD
- parsed trailers for upstream HEAD
- recent DWP-related commits, limited to last N commits
- body/payload of selected commit
- raw commit message
- structured trailer key/value view without changing key casing

### Commit detail view

For a selected commit, show:

- full hash
- short hash
- author
- author date
- committer date
- title
- body
- trailers
- raw message

### Refresh

- Manual refresh button.
- Optional polling toggle, default off or low-frequency.
- Refresh must reload all derived repo state from Git.
- Remote fetch is a separate explicit action, not implicit in auto-refresh.

### Error handling

Show useful errors for:

- invalid repo path
- not a Git repo
- git not installed
- command timeout
- inaccessible remote
- malformed commit/trailer data

Tolerance rules:

- If commit metadata loads but trailer parsing fails partially, still show raw commit message and any fields that were parsed successfully.
- Distinguish UI-derived `unknown` state from `parse-error`; they are not the same condition.
- A parse failure in one commit must not block branch list rendering for the rest of the repository.
- When upstream refs are stale because no fetch has occurred, show the last known remote-tracking facts and avoid implying freshness.
- Missing or invalid trailer data should be presented as non-actionable protocol input, with UI diagnostics layered on top.

---

## Technical spec

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap`](IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap)
- Ticket: [`tickets/1-bootstrap-app-shell.md`](tickets/1-bootstrap-app-shell.md)

### Tech stack

- Electron
- React
- electron-vite
- Zustand
- No router initially
- JavaScript, not TypeScript

### High-level architecture

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap`](IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap)
- Ticket: [`tickets/1-bootstrap-app-shell.md`](tickets/1-bootstrap-app-shell.md)

Three layers:

#### 1. Renderer

React UI + Zustand stores.

Responsibilities:

- render views
- trigger refresh/select actions
- display derived state and raw details
- never execute shell commands directly

#### 2. Preload

A narrow, explicit bridge exposed via `contextBridge`.

Responsibilities:

- expose safe app API to renderer
- validate argument shapes minimally
- not contain domain logic

#### 3. Main process

Owns Git execution and domain services.

Responsibilities:

- execute Git commands with `execFile` or `spawn`
- parse Git output
- compose repo snapshot
- map low-level Git facts into DWP domain state

---

## Module structure

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap`](IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap)
- Ticket: [`tickets/1-bootstrap-app-shell.md`](tickets/1-bootstrap-app-shell.md)

```txt
src/
  main/
    index.js
    ipc/
      repo.js
    services/
      git.js
      dwp.js
      parser.js
      repoSnapshot.js
  preload/
    index.js
  renderer/
    main.jsx
    app/
      App.jsx
    stores/
      ui.js
      repo.js
    components/
      RepoPicker.jsx
      BranchList.jsx
      BranchStatusBadge.jsx
      BranchDetail.jsx
      CommitDetail.jsx
      RemotePanel.jsx
      Toolbar.jsx
      ErrorBanner.jsx
```

---

## Renderer state model

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-6-renderer-state-and-data-flow`](IMPLEMENTATION_PLAN.md#milestone-6-renderer-state-and-data-flow)
- Ticket: [`tickets/7-build-renderer-stores.md`](tickets/7-build-renderer-stores.md)

### ui store

```js
{
  selectedRepoPath: null,
  selectedBranch: null,
  selectedRemote: 'origin',
  selectedCommitHash: null,
  selectedView: 'overview', // overview | branch | commit | settings
  autoRefresh: false,
  refreshIntervalMs: 5000
}
```

### repo store

```js
{
  snapshot: null,
  isRefreshing: false,
  error: null,
  lastRefreshedAt: null
}
```

### snapshot shape

```js
{
  repoPath: '/path/to/repo',
  generatedAt: '2026-03-28T12:00:00.000Z',
  currentBranch: 'main',
  remotes: [
    { name: 'origin', fetchUrl: '...', pushUrl: '...' }
  ],
  branches: [
    {
      name: 'main',
      isCurrent: true,
      upstream: 'origin/main',
      ahead: 0,
      behind: 1,
      diverged: false,
      localHead: {
        hash: 'abc123',
        shortHash: 'abc123',
        author: '...',
        authorDate: '...',
        committerDate: '...',
        title: '...',
        body: '...',
        rawMessage: '...',
        trailers: {
          'dwp-state': ['working'],
          'dwp-origin-state': ['review']
        },
        dwpState: 'working'
      },
      remoteHead: {
        hash: 'def456',
        shortHash: 'def456',
        author: '...',
        authorDate: '...',
        committerDate: '...',
        title: '...',
        body: '...',
        rawMessage: '...',
        trailers: {
          'dwp-state': ['review']
        },
        dwpState: 'review'
      },
      workflow: {
        localState: 'working',
        remoteState: 'review',
        effectiveState: null,
        syncStatus: 'behind',
        warnings: [],
        lease: {
          status: 'active', // active | expired | unknown | n/a
          originState: 'review',
          runId: '...',
          runnerId: '...',
          leaseSeconds: 300
        }
      }
    }
  ]
}
```

Date fields are ISO 8601 UTC strings in serialized payloads.

---

## IPC contract

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract`](IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract)
- Ticket: [`tickets/6-wire-ipc-and-preload.md`](tickets/6-wire-ipc-and-preload.md)

### preload API

```js
window.woqso = {
  selectRepo: () => Promise<{ repoPath } | { error }>,
  loadRepoSnapshot: (repoPath, options) => Promise<RepoSnapshot>,
  getBranchDetails: (repoPath, branchName, remoteName) => Promise<BranchDetails>,
  getCommitDetails: (repoPath, commitHash) => Promise<CommitDetails>,
  fetchRemote: (repoPath, remoteName) => Promise<{ ok: true } | { ok: false, error: string }>
}
```

### BranchDetails shape

```js
{
  repoPath: '/path/to/repo',
  branchName: 'main',
  comparedRemoteName: 'origin',
  upstream: 'origin/main',
  localHead: CommitDetails,
  remoteHead: CommitDetails | null,
  ahead: 0,
  behind: 1,
  diverged: false,
  syncStatus: 'behind',
  workflow: {
    localState: 'working',
    remoteState: 'review',
    effectiveState: null,
    warnings: [],
    lease: {
      status: 'active',
      originState: 'review',
      runId: '...',
      runnerId: '...',
      leaseSeconds: 300
    }
  },
  recentDwpCommits: [CommitDetails],
  rawEvidence: {
    localRef: 'refs/heads/main',
    upstreamRef: 'refs/remotes/origin/main'
  }
}
```

### CommitDetails shape

```js
{
  hash: 'abc123...',
  shortHash: 'abc123',
  author: '...',
  authorEmail: '...',
  authorDate: '2026-03-28T12:00:00.000Z',
  committer: '...',
  committerEmail: '...',
  committerDate: '2026-03-28T12:00:00.000Z',
  title: '...',
  body: '...',
  rawMessage: '...',
  trailers: {
    'dwp-state': ['working']
  },
  stableTrailers: {
    'dwp-state': ['working'],
    'dwp-source': ['git:origin'],
    'dwp-log-level': ['info']
  },
  dwpState: 'working',
  parseStatus: 'ok', // ok | partial | failed
  actionable: true
}
```

`stableTrailers` means structurally normalized for repeated values and stable UI access; it must preserve the original key casing exactly as parsed.

### IPC channels

- `repo:select`
- `repo:loadSnapshot`
- `repo:getBranchDetails`
- `repo:getCommitDetails`
- `repo:fetchRemote`

Renderer must never send arbitrary command strings.

---

## Git service requirements

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer`](IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer)
- Ticket: [`tickets/2-build-git-execution-layer.md`](tickets/2-build-git-execution-layer.md)

### Command execution

- Use `execFile` or `spawn`.
- Never use `exec` with interpolated shell strings.
- Always pass `cwd: repoPath`.
- Add timeouts for commands that may hang.
- Capture `stdout` and `stderr`.
- Return structured errors.
- Prefer batched Git queries over per-branch subprocesses when the same facts can be collected in bulk.

### Minimum Git commands likely needed

Examples, not mandatory exact implementation:

- validate repo:
  - `git rev-parse --is-inside-work-tree`

- current branch:
  - `git branch --show-current`

- list local branches and upstreams:
  - `git for-each-ref --format=... refs/heads`

- list remotes:
  - `git remote -v`

- ahead/behind vs upstream:
  - `git rev-list --left-right --count branch...upstream`

- local HEAD commit metadata:
  - `git log -1 --format=... <ref>`

- remote HEAD commit metadata:
  - `git log -1 --format=... <upstreamRef>`

- recent commits for branch:
  - `git log --format=... -n 20 <ref>`

### Parsing strategy

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-2-commit-parser-and-dwp-extraction`](IMPLEMENTATION_PLAN.md#milestone-2-commit-parser-and-dwp-extraction)
- Ticket: [`tickets/3-implement-commit-parser.md`](tickets/3-implement-commit-parser.md)

Prefer collecting raw commit message once and parsing locally in JS.

The parser must follow Git trailer rules for the trailing trailer block and should match the observable behavior of `git interpret-trailers`.

For each commit:

- first line => title
- body => message body excluding trailers
- trailers => structured key/value map preserving repeated keys and original key casing
- `dwp-state` => derived using last-wins if repeated
- `actionable` => `true` only when trailer parsing succeeded well enough to read the trailing trailer block and a canonical `dwp-state` was found

Trailer parsing must:

- treat trailer keys as case-sensitive
- preserve raw values
- support repeated keys
- not assume only one trailer exists
- filter `dwp-*` trailers for workflow metadata views
- expose `parseStatus: ok | partial | failed`
- extract protocol data only from the final trailing trailer block, not from arbitrary message lines that look similar
- treat missing canonical `dwp-state` or failed trailer parsing as non-actionable at the protocol layer

---

## DWP domain service

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-3-dwp-domain-derivation`](IMPLEMENTATION_PLAN.md#milestone-3-dwp-domain-derivation)
- Ticket: [`tickets/4-add-dwp-derivation.md`](tickets/4-add-dwp-derivation.md)

### Responsibility

Convert raw Git facts into DWP-specific derived state.

### Inputs

- local branch commit metadata
- upstream branch commit metadata
- ahead/behind/divergence data
- parsed trailers

### Outputs

For each branch:

```js
{
  localState: string | null,
  remoteState: string | null,
  effectiveState: string | null, // app-derived, non-normative
  warnings: string[],
  syncStatus: 'in-sync' | 'ahead' | 'behind' | 'diverged' | 'no-upstream',
  lease: {
    status: 'active' | 'expired' | 'unknown' | 'n/a', // app-derived freshness heuristic
    originState: string | null,
    runId: string | null,
    runnerId: string | null,
    leaseSeconds: number | null
  }
}
```

### State derivation rules

Initial assumptions for v1:

- Use `dwp-state` as the primary state carrier.
- Open-ended `dwp-state` values may appear and should be displayed as-is.
- Some states are reserved by DWP and should be recognized as reserved protocol values without assigning extra workflow semantics beyond what the contract defines.
- If no canonical, case-sensitive `dwp-state` trailer exists on HEAD, the UI-derived state is `unknown`.
- If trailer parsing fails or canonical `dwp-state` is absent, the commit is non-actionable at the protocol layer.
- If multiple `dwp-state` trailers exist, last wins.
- If local and remote differ, expose both and avoid inventing workflow semantics.
- In v1, `effectiveState` is defined strictly as:
  - `localState` when local and remote hashes match
  - `localState` when there is no upstream
  - `null` when local and remote states differ or hashes differ in a way that would require semantic interpretation
- If no upstream exists, mark sync status as `no-upstream`.
- If branch is diverged, flag prominently.
- Only derive lease/liveness for `dwp-state: working`.

### Working lease rules

When `dwp-state` is `working`, inspect reserved working-lease trailers when present:

- `dwp-origin-state`
- `dwp-run-id`
- `dwp-runner-id`
- `dwp-lease-seconds`

Also surface standardized optional DWP metadata when present:

- `dwp-source`
- `dwp-log-level`

Lease status may be derived conservatively using `committerDate` and available lease metadata as an app-level freshness heuristic. This heuristic is non-normative and must not be presented as part of DWP/GC semantics.

- `active`
- `expired`
- `unknown`
- `n/a`

### Important constraint

Do not bake in speculative workflow rules that are not part of the protocol.
Only derive what can be justified from Git data and known DWP/AYNIG conventions.

---

## UI requirements

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-7-core-ui-screens`](IMPLEMENTATION_PLAN.md#milestone-7-core-ui-screens)
- Ticket: [`tickets/8-build-core-ui.md`](tickets/8-build-core-ui.md)

### Main layout

Single window with 3 regions:

- left sidebar: repos/branches/remotes
- center panel: selected branch overview / workflow state
- right panel or bottom panel: commit details / trailers / raw data

### Branch list row

Each branch row should show:

- branch name
- current-branch marker
- upstream name or `no upstream`
- ahead/behind summary
- `dwp-state` badge
- warning marker if diverged/error/unknown
- lease marker when state is `working` as an app-derived diagnostic

### Branch detail panel

Must show both:

- a human-readable summary
- raw evidence

Example sections:

- Local branch
- Upstream branch
- DWP state
- Lease status (app-derived heuristic)
- Recent commits
- Raw trailers
- Parse warnings when applicable

### Status badges

At minimum:

- textual `dwp-state`
- `unknown` (UI diagnostic)
- `diverged`
- `no upstream`
- `ahead`
- `behind`
- `lease active` (app diagnostic)
- `lease expired` (app diagnostic)
- `lease unknown` (app diagnostic)

Keep labels textual, not icon-only.

---

## Persistence

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-8-persistence-and-convenience`](IMPLEMENTATION_PLAN.md#milestone-8-persistence-and-convenience)
- Ticket: [`tickets/9-add-persistence-and-fetch-ux.md`](tickets/9-add-persistence-and-fetch-ux.md)

Use local app storage for:

- recent repositories
- selected remote per repo
- auto-refresh preference
- panel widths if easy

Do not store repo data cache beyond convenience unless needed.

---

## Performance expectations

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-4-repo-snapshot-composition`](IMPLEMENTATION_PLAN.md#milestone-4-repo-snapshot-composition)
- Ticket: [`tickets/5-compose-repo-snapshots.md`](tickets/5-compose-repo-snapshots.md)

- Repositories with dozens of branches should feel responsive.
- Initial snapshot should not require scanning full history.
- Limit expensive calls to relevant refs and recent commits.
- Avoid per-branch commands when a batched Git command can provide the same information.
- Snapshot loading should be designed around batched `for-each-ref` output plus a small number of follow-up `log` and `rev-list` calls.

---

## Security constraints

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer`](IMPLEMENTATION_PLAN.md#milestone-1-git-execution-layer)
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract`](IMPLEMENTATION_PLAN.md#milestone-5-ipc-and-preload-contract)
- Ticket: [`tickets/2-build-git-execution-layer.md`](tickets/2-build-git-execution-layer.md)
- Ticket: [`tickets/6-wire-ipc-and-preload.md`](tickets/6-wire-ipc-and-preload.md)

- Renderer must not access Node APIs directly.
- `contextIsolation` enabled.
- `nodeIntegration` disabled.
- No arbitrary shell execution from renderer input.
- Sanitize repo paths and ref names before command execution.
- All Git execution confined to known commands with known argument shapes.

---

## v1 acceptance criteria

- User can select a local Git repo.
- App loads branches and remotes successfully.
- App shows current `dwp-state` for each branch based on HEAD trailers.
- App compares local and upstream state when upstream exists.
- App shows ahead/behind/diverged correctly.
- App displays commit title/body/trailers for selected branch.
- App surfaces `working` lease facts when present.
- App handles invalid repos and missing Git gracefully.
- App works without any backend/API.

---

## Suggested implementation plan

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)
- Tickets: [`tickets/`](tickets)

### Phase 1

- Electron app shell
- repo picker
- preload bridge
- main Git service
- basic snapshot loading

### Phase 2

- branch list
- remote list
- selected branch details
- commit details
- trailer parsing

### Phase 3

- DWP domain derivation
- sync status badges
- lease status
- error states
- manual refresh

### Phase 4

- recent repos persistence
- optional auto-refresh
- polish

### Phase 5

- parser and domain tests
- snapshot composition tests
- fixture commits covering multiline bodies, repeated trailers, missing `dwp-state`, and parse failures

---

## Notes for implementation

Implementation links:
- Plan: [`IMPLEMENTATION_PLAN.md#milestone-10-testing`](IMPLEMENTATION_PLAN.md#milestone-10-testing)
- Ticket: [`tickets/10-add-tests-and-polish.md`](tickets/10-add-tests-and-polish.md)

- Keep Git service pure and testable.
- Keep DWP logic isolated from Electron.
- Prefer raw Git facts + explicit derived state over opaque abstractions.
- Avoid overengineering around routing, window management, or background workers in v1.
- Treat workflow states as open-ended protocol values, not product-defined categories.
- Prefer showing ambiguity explicitly over collapsing it into a synthetic state label.
- Keep protocol terminology separate from UI diagnostics such as `unknown` and `parse-error`.
