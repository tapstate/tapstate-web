# Local Cloud and Cluster Preview

Use the project launcher to run both front ends locally against explicitly
selected HTTPS origins:

```sh
pnpm dev:cloud-proxy
```

Enter the Cloud Console and Cluster HTTPS origins at the terminal prompts.
This keeps them out of shell history. Supply origins only, with no path, query,
fragment, or credentials. The launcher accepts the current environment's
origins at runtime; no Cloud or Cluster host is fixed in source. Non-interactive
sessions can pass `--cloud-origin` and `--cluster-origin` explicitly.

The launcher starts Cloud Console on `http://localhost:5174` and Cluster Console
on `http://localhost:5173`. Cloud `/v1/api` requests use the supplied Cloud
origin. Cluster `/auth`, `/api`, `/version`, and `/connector-icons` requests use
the supplied Cluster origin. The local Cluster handoff works only in Vite dev
mode and only when Cloud resolves the exact Cluster origin passed to the
launcher.

The child Vite processes receive a small environment allowlist and an empty,
private temporary env directory. Repository and home-directory dotenv files
are not loaded for this run. The launcher does not collect credentials, upload
local files, write an `.env` file, or log request bodies. Sensitive query values
such as exchange codes are redacted from forwarded Vite logs. The temporary
directory is removed when both servers stop.

The browser submits Cloud login to the supplied Cloud origin. All Cluster API
requests go to the supplied Cluster origin. Saving or starting a pipeline,
creating a source, and other write actions change data on that remote Cluster;
use a development environment for this workflow.

Press Ctrl+C in the launcher terminal to stop both Vite servers.
