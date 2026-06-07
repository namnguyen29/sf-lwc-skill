# fe-lwc-skill

Salesforce LWC Frontend Skill for AI Agents — installs structured rule files for Lightning Web Components development into your project's agent config directory.

## Install

```bash
# Auto-detect agent runtime (Claude Code, Cursor, Gemini CLI, Continue.dev, Copilot)
npx fe-lwc-skill

# Install to a specific path
npx fe-lwc-skill --target .claude/skills/fe-lwc

# Overwrite existing install
npx fe-lwc-skill --force
```

## Supported runtimes

| Runtime        | Auto-detected via | Installs to                    |
| -------------- | ----------------- | ------------------------------ |
| Claude Code    | `.claude/`        | `.claude/skills/fe-lwc/`       |
| Gemini CLI     | `.gemini/`        | `.gemini/skills/fe-lwc/`       |
| Cursor         | `.cursor/`        | `.cursor/rules/fe-lwc/`        |
| Continue.dev   | `.continue/`      | `.continue/rules/fe-lwc/`      |
| GitHub Copilot | `.github/`        | `.github/instructions/fe-lwc/` |

If multiple runtimes are detected, the skill is installed to all of them.

## What's included

```
skill/
├── SKILL.md                        # Agent entry point
└── rules/
    ├── data-wire-vs-imperative.md
    ├── data-lds-first.md
    ├── data-error-handling.md
    ├── template-directives.md
    ├── template-form-pattern.md
    ├── template-dom-query.md
    ├── events-custom-event.md
    ├── events-lms.md
    ├── design-token-slds.md
    └── design-token-dxp.md
```

## After install

Reference the skill in your `CLAUDE.md` / `AGENTS.md`:

```markdown
## Skills

- LWC Frontend: `.claude/skills/fe-lwc/SKILL.md`
```
