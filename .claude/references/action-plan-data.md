# Action plan data shape & persistence

`generateActionPlan()` returns `MasterActionPlan` = `{ title, summary, implementation_document, milestones[] }`. Each `Milestone` has `title`, `category` (`Setup|Integration|Automation|Optimization`), `priority` (`high|medium|low`), `done_when`.

Milestone completion state is tracked client-side only, in `localStorage` under the key `map-milestones:{sanitizedTitle}` — there's no server-side persistence. Changing the plan title changes the storage key.
