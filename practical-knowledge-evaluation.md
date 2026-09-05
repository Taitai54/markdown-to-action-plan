# Practical Knowledge Evaluation

Use this rubric to compare generated plans before and after prompt changes. Evaluate the same source with the same provider/model where possible.

## Test Fixtures

Run one source from each category:

- **Book or essay:** a chapter with several principles and examples.
- **YouTube transcript:** a talk that mixes concepts, stories, and advice.
- **Technical PDF:** documentation or a guide with procedures and configuration.
- **Tip collection:** short notes where the value is in concrete habits.
- **Code source:** a tutorial containing code, dependencies, configuration, and tests.
- **Mixed or conflicting sources:** two documents that use different terminology or disagree on a recommendation.

## Scoring

Score each dimension from 0 to 2:

- `0` = missing, generic, or misleading.
- `1` = present but incomplete, weakly grounded, or difficult to apply.
- `2` = specific, source-grounded, and immediately useful.

| Dimension | Question |
|---|---|
| Orientation | Can a reader explain the source's central problem and thesis? |
| Concept clarity | Are important terms defined and related to one another? |
| Principle extraction | Are the major principles distinct from procedures and tips? |
| Use conditions | Does each major idea say when to use it and when not to use it? |
| Decision rule | Is there a trigger, threshold, or choice rule where the source supports one? |
| Example quality | Does each major idea have a realistic context, inputs, actions, and outcome? |
| Practical action | Is there a smallest next action the reader can take? |
| Verification | Can the reader observe whether the action or idea worked? |
| Procedural detail | Are URLs, UI labels, commands, paths, values, and prerequisites preserved? |
| Code completeness | Are runtime, dependencies, files, configuration, inputs, outputs, errors, and tests covered? |
| Grounding | Are source-backed claims distinguishable from synthesis and assumptions? |
| Source gaps | Are missing details stated instead of invented? |
| Transfer | Can the reader apply the idea to a new situation without reopening the source? |
| Focus | Does the output add useful depth without burying the next action? |

Maximum score: `28`.

## Acceptance Thresholds

- At least `90%` of major concepts and principles score `2` for Example quality.
- At least `90%` score `2` for Verification.
- Code sources score `2` for Procedural detail and Code completeness, or explicitly identify the missing source detail.
- No unsupported exact URL, UI label, numeric threshold, API behavior, or code requirement is presented as source-backed.
- A reader can identify the first useful action in under two minutes.
- The richer output must not reduce the score for procedural detail or focus compared with the previous prompt.

## Reader Check

After reading a generated plan without reopening the source, answer:

1. What is the central idea in one sentence?
2. When would I use it, and when would I avoid it?
3. What is one realistic situation where it applies?
4. What will I do next?
5. What observable result will tell me it worked?

A plan passes the transfer check when all five answers can be given without guessing source-specific details.

## Regression Notes

Record the source, provider/model, preset, date, total score, missing examples, missing verification steps, unsupported specifics, and whether manual rewriting was needed. Keep the previous output so prompt changes can be compared rather than judged from memory.
