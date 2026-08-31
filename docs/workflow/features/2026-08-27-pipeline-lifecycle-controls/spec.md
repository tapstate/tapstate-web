# Pipeline list lifecycle controls

**Status:** In progress  
**Date:** 2026-08-27  
**Owner:** ws/beta-web-ui

## Original request

Add real start and stop operations to the Pipeline list.

## Goals

- Keep lifecycle controls compact and adjacent to the runtime status.
- Use the existing Pipeline lifecycle endpoints, rather than optimistic local state.
- Require a confirmation before stopping a running Pipeline.
- Refresh every Pipeline projection affected by a lifecycle mutation.

## Non-goals

- Add pause or resume controls.
- Add a table-wide Actions column.
- Change the backend runtime state machine.
- Move lifecycle actions into the editor workspace.

## User path

1. An operator sees one compact labeled lifecycle action next to a Pipeline's status.
2. A startable Pipeline starts immediately.
3. A stoppable Pipeline opens a confirmation dialog, then stops after confirmation.
4. The client re-fetches the list, detail, runtime status, metrics, and logs.
5. A failed mutation appears in one dismissible fixed feedback surface outside the table flow.

## State matrix

| Runtime state | Available operation | Confirmation |
| --- | --- | --- |
| `NEW`, `STOPPED`, `COMPLETED`, `FAILED` | Start | No |
| `RUNNING`, `PAUSED` | Stop | Yes |
| Unavailable | None | N/A |

## Data and errors

- Start calls `POST /api/pipelines/{id}:start`.
- Stop calls `POST /api/pipelines/{id}:stop`.
- Pending controls stay disabled with stable dimensions.
- A mutation failure is visible in a fixed feedback surface outside the table and can be dismissed explicitly or by starting another mutation.

## i18n

All new visible text is added to `en`, `zh-CN`, and `zh-TW`.

## Risks

- Runtime state may change between list refresh and action selection. The backend remains authoritative and the client re-fetches after every result.
- Stop interrupts work. It is explicitly confirmed before transport begins.
