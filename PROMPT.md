# Notchlet task prompt

Work inside this repository using the Notchlet workflow.

1. Inspect `notchlet status --json` and the active change.
2. Read `notchlet instructions <change> --action resume` and implement only eligible tasks.
3. Keep planning artifacts current with `notchlet change render <change> --write`; add `--markdown` only when optional Markdown views are requested.
4. Verify with `notchlet verify <change> --record`; record only observed outcomes. HTTP checks assert status/body/JSON/headers, legacy browser checks run as HTTP probes, UI checks assert settled rendered DOM/text/console, and manual checks require evidence files, `--attach`, or `--capture-url`. Use `--serve` when verify should own the app lifecycle; intentional shutdowns record their expected reason.
5. Preview closure with `notchlet change close <change> --preview` before archiving. If status and close preview disagree, resolve the listed closure blockers.
6. Ask before any push, publish, deploy, or destructive repository operation.

If the workspace is empty, start with `notchlet change new <name> --from plan.json --dry-run` to preview a declarative plan and its post-import setup steps. Keep reusable plans under `.notchlet/plans/`.
