# Domain docs

How the engineering skills should consume this repository’s domain documentation when exploring the codebase.

## Layout

This is a single-context repository:

- `CONTEXT.md` at the repository root contains the domain glossary and model
- `docs/adr/` contains system-wide architectural decisions

The files and directories are created lazily when domain terms or decisions are first recorded.

## Before exploring, read these

- `CONTEXT.md` at the repository root
- ADRs under `docs/adr/` that affect the area being changed

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. The domain-modeling workflow creates them when terms or decisions are actually resolved.

## Use the glossary’s vocabulary

When output names a domain concept—in an issue title, refactor proposal, hypothesis, or test name—use the term defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is missing, reconsider whether the language belongs to the project or note the genuine gap for domain modeling.

## Flag ADR conflicts

If output contradicts an existing ADR, surface that conflict explicitly rather than silently overriding the decision.
