# Ticket 1: Bootstrap app shell

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap`](../IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap)
- Spec: [`SPEC.md#technical-spec`](../SPEC.md#technical-spec)

## Plan

### Objective

Scaffold the Electron + React application shell so that the app launches with a visible three-region layout, a working preload bridge, and hardened security defaults. This is the foundation all later milestones build on.

### Scope

- Project initialization via `electron-vite` (JavaScript, not TypeScript).
- Directory structure matching SPEC.md module layout.
- Electron security configuration.
- Minimal main process entry point.
- Minimal preload bridge exposing an empty `window.woqso` object.
- Minimal React renderer with a three-region layout (left sidebar, center panel, right panel).
- Basic Zustand store stubs (ui, repo) — shape only, no logic beyond initial state.
- No Git execution, no IPC handlers, no domain services yet.

### Steps

1. **Initialize project with electron-vite**
   - Run `npm create @electron-vite/create` or equivalent scaffolding, selecting JavaScript.
   - Verify the generated `package.json`, `electron.vite.config.*`, and entry points.
   - Remove any template content that is not needed.

2. **Create directory structure**
   - `src/main/` — main process entry (`index.js`)
   - `src/main/ipc/` — empty, placeholder for `repo.js` (Milestone 5)
   - `src/main/services/` — empty, placeholder for `git.js`, `dwp.js`, `parser.js`, `repoSnapshot.js` (Milestones 1–4)
   - `src/preload/` — preload entry (`index.js`)
   - `src/renderer/` — renderer entry (`main.jsx`)
   - `src/renderer/app/` — `App.jsx`
   - `src/renderer/stores/` — `ui.js`, `repo.js`
   - `src/renderer/components/` — empty, placeholder for future components

3. **Configure Electron security defaults** (`src/main/index.js`)
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `webPreferences.preload` pointing to compiled preload script
   - Disable `remote` module if present in template
   - Set a `Content-Security-Policy` meta tag or header restricting scripts to `'self'`

4. **Build preload bridge** (`src/preload/index.js`)
   - Use `contextBridge.exposeInMainWorld` to expose `window.woqso` with placeholder methods that return `Promise.reject(new Error('not implemented'))`:
     - `selectRepo`
     - `loadRepoSnapshot`
     - `getBranchDetails`
     - `getCommitDetails`
     - `fetchRemote`
   - This establishes the IPC contract shape from SPEC.md early so renderer code can depend on the correct API surface.

5. **Build renderer shell**
   - `src/renderer/main.jsx` — React root, renders `<App />`
   - `src/renderer/app/App.jsx` — three-region CSS grid/flex layout:
     - Left: `<aside>` with id `sidebar` (placeholder text "Sidebar")
     - Center: `<main>` with id `center` (placeholder text "Center")
     - Right: `<aside>` with id `detail` (placeholder text "Detail")
   - Minimal CSS in a `styles.css` or inline — focus on layout correctness, not visual polish.

6. **Stub Zustand stores**
   - `src/renderer/stores/ui.js` — export a `useUiStore` with initial state matching SPEC.md:
     ```js
     { selectedRepoPath: null, selectedBranch: null, selectedRemote: 'origin', selectedCommitHash: null, selectedView: 'overview', autoRefresh: false, refreshIntervalMs: 5000 }
     ```
   - `src/renderer/stores/repo.js` — export a `useRepoStore` with initial state:
     ```js
     { snapshot: null, isRefreshing: false, error: null, lastRefreshedAt: null }
     ```
   - No actions yet — just the store shapes.

7. **Verify the build**
   - `npm run dev` launches the Electron window.
   - Window shows the three-region layout.
   - DevTools confirms `window.woqso` exists with five methods.
   - Attempting to call `require('child_process')` in renderer console fails (nodeIntegration disabled).

### Risks

- electron-vite template may include extras (e.g., TypeScript config, sample components) that need cleanup; handle during step 1.
- Preload path resolution in dev vs. production may differ; verify both in step 4.
- CSP headers may break devtools or hot-reload; use a permissive `'unsafe-inline'` for dev and tighten before v1 release.

### Verification

- `npm run dev` opens a window with no errors.
- Three visible regions (sidebar, center, detail) are present.
- `window.woqso` is an object with five methods in DevTools console.
- `window.require` and `window.process` are undefined in renderer.
- `npm run build` produces output without errors.
