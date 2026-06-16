# AGENTS.md

## Cursor Cloud specific instructions

### Repository state

This repository is currently a bare npm scaffold. The only tracked source file is
`package.json` (CommonJS, `"type": "commonjs"`). There is **no application code,
no dependencies, no tests, and no lint configuration** yet:

- `package.json` declares `"main": "index.js"`, but `index.js` does not exist.
- The `test` script is the npm default placeholder (`echo "Error: no test specified" && exit 1`), so `npm test` exits non-zero by design.
- There is no build, dev, lint, or start script.

### Environment

- Runtime: Node.js (v22.x) with npm. No version is pinned in the repo (no `.nvmrc`/`engines`), so the VM default Node 22 is used.
- Setup: `npm install` (installs zero dependencies today, but generates/refreshes `package-lock.json`). This is handled by the startup update script.

### Running / testing / building

There is nothing to run, test, build, or lint until application code is added.
Once code exists, add the corresponding scripts to `package.json` (e.g. `start`,
`dev`, `lint`, `test`) and update this section. Until then:

- `npm install` — install deps (no-op beyond lockfile today).
- `node <file>.js` — run a script directly once one exists.
