# Ticket 1: Bootstrap app shell

- Plan: [`IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap`](../IMPLEMENTATION_PLAN.md#milestone-0-project-bootstrap)
- Spec: [`SPEC.md#technical-spec`](../SPEC.md#technical-spec)

## Step

- Initialize the project with `electron-vite` in JavaScript.
- Create the folder structure from the implementation plan.
- Configure Electron security defaults: `contextIsolation: true` and `nodeIntegration: false`.
- Add a minimal main window, preload bridge, and three-region renderer shell.

## Validation

- The app starts locally without errors.
- The renderer loads a visible shell with left, center, and right regions.
- The renderer cannot access Node APIs directly.
