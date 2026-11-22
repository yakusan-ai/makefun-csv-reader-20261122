# CSV reader — correctness baseline

An independent, dependency-free implementation of the written broken-CSV policy
for make.fun `csv-reader-speed-01-run-20261121` (program/v1).

## Run

Node 22.23.5 was used for development. No installation or build step is needed.
Run `node main.ts`. The driver reads `/input/cases.json` and writes
`/output/answers.json`; both directories must already exist. Outside the harness,
set `MAKEFUN_INPUT_DIR` and `MAKEFUN_OUTPUT_DIR` to override those paths.
Each input is `{text, header}`; `solve.js` exports `run(input)` and returns
`{columns, rows, errors}` without retaining state between calls.

## Design and verification

The parser uses explicit field states (start, plain, quoted, and tail). An
unclosed quoted field rolls back to its opening position and is read again as
plain text. Record completion handles width normalization and its errors.
The house harness driver is retained; the parser is independently written.

Session 1 prioritizes exact behavior. Differential tests and the kit remain
outside this repository in the parent workspace's `tests-outside/` directory.
They compare full JSON values with the reference, including error order and keys,
and exercise the practice driver twice for deterministic output. The build
report in the parent workspace records the commands, counts and timing results.
There are no dependencies, configured lint/type tools, or compilation step.
Speed work is reserved for session 2.

MIT licensed. No make.fun submission is performed by this project.
