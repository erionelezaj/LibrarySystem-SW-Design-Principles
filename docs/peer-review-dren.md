# Peer review — Dren Veliu's contribution

**Reviewer:** Lorand Pervizaj · **Date:** 25 November 2026 · **Status:** nothing to review yet

## What I inspected

| Source | Result |
|---|---|
| `origin/Doreni005-patch-1` | Part 1 planning branch (tip: `Add planning comments and benchmarks`, Oct 2026). Adds a 4-line planning note, not merged into `main`. No code. |
| `origin/Doreni005-patch-2` | Part 1 risk-identification branch (tip: `Add anticipated risks for design considerations`, Oct 2026). Adds `anticipatedRisksV1` (21 lines), not merged into `main`. No code. Related Part 1 risk documentation did land through merged PR #2 (`docs/expectedDesignRisks`, since removed from `main`). |
| Open/closed PRs on the team repo | Only PRs #1–#4 (Part 1 documentation, all merged). No open or recent PR from Dren. |
| GitHub account `Doreni005` | Public repositories: `learning-the-javascript-language-4369302`, `LearningGitHub01`, `swen383-todo`. No fork of `LibrarySystem-SW-Design-Principles`. |
| Local working tree | Only my own branches are present; no teammate branch carries `Student.js`, `Copy.js`, `Catalog.js`, `CollectionController.js`, `LibraryRenderer.js` or `index.html`. |

**Finding:** Dren's Part 2 contribution (`Student.js`, `Copy.js`, `Catalog.js`, `CollectionController.js`,
`index.html`, `LibraryRenderer.js`, collection methods in `Book.js`, `seq-mark-damaged-copy.puml`) is not
available in the repository, in any branch or in any pull request at the time of writing. In line with the
team rule not to fabricate review results, there are **no findings to report** — no code of his has been read,
approved or criticized here.

## What I will check as soon as his branch lands

1. **Correctness** — `Copy.currentLoan()` returns `null` once `loan.returnedDate` is set; `isAvailable()`
   is `false` while the copy is damaged, on hold or on loan; a copy on loan cannot be marked damaged.
2. **Consistency with the class diagram** — exactly the Part 1 signatures (`getStatus`, `canLendTo`,
   `isInUse`, `findCopy`, `findBook`, `findOverdueLoans`, `findExpiredHolds`), no renamed or missing members.
3. **File ownership** — changes only in his own files, plus his own sequence diagram.
4. **SOLID / GRASP** — `Catalog` as Information Expert for its queries, no business rule in the renderer.
5. **Separation of UI and business logic** — `LibraryRenderer` only calls controllers and re-renders; no
   domain decisions in `index.html`.
6. **Dependency direction** — renderer → controller → domain, never domain → renderer.
7. **Hardcoded policy values** — no loan period, hold period or fine rate outside `LibrarySettings`.
8. **Copy availability and damage handling** — `heldFor` set/cleared consistently with Elion's
   `Reservation.hold()`/`expire()`, so a copy is never available and reserved at the same time.
9. **Compatibility with my return and fine code** — `getBook()`, `currentLoan()`, the availability rule and
   the renderer sequence for `returnCopy` / `payFine` / `waiveFine` / daily scheduler run described in
   `docs/integration-notes.md`.
10. **Unnecessary complexity** — plain ES modules, classes and constructors, no frameworks or extra layers.

**Rule I will apply:** bugs that break the agreed contract or the team rules are blocking findings; style
preferences are marked as optional improvements. I will not approve a PR with unresolved blocking findings.
