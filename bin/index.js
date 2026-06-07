#!/usr/bin/env node

import { cpSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_NAME = "fe-lwc";

/**
 * Known agent runtimes and where they expect skill/rule files.
 * Add new entries here as new agents emerge.
 */
const AGENT_RUNTIMES = [
  {
    id: "claude-code",
    label: "Claude Code",
    markerDir: ".claude",
    skillPath: `.claude/skills/${SKILL_NAME}`,
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    markerDir: ".gemini",
    skillPath: `.gemini/skills/${SKILL_NAME}`,
  },
  {
    id: "cursor",
    label: "Cursor",
    markerDir: ".cursor",
    skillPath: `.cursor/rules/${SKILL_NAME}`,
  },
  {
    id: "continue",
    label: "Continue.dev",
    markerDir: ".continue",
    skillPath: `.continue/rules/${SKILL_NAME}`,
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    markerDir: ".github",
    skillPath: `.github/instructions/${SKILL_NAME}`,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const skillSrc = join(__dirname, "../skill");
const cwd = process.cwd();

function install(destPath, { force = false } = {}) {
  const abs = resolve(cwd, destPath);

  if (existsSync(abs)) {
    if (!force) {
      console.log(`  ⚠️  Already exists: ${destPath}`);
      console.log(`      Use --force to overwrite.`);
      return false;
    }
    rmSync(abs, { recursive: true, force: true });
  }

  mkdirSync(abs, { recursive: true });
  cpSync(skillSrc, abs, { recursive: true });
  console.log(`  ✅ Installed → ${destPath}`);
  return true;
}

function printHelp() {
  console.log(`
Usage:
  npx ${SKILL_NAME}-skill [options]

Options:
  --target <path>   Install to a specific directory (relative to project root)
  --force           Overwrite if skill already exists
  --help            Show this message

Examples:
  npx fe-lwc-skill                          # auto-detect agent runtimes
  npx fe-lwc-skill --target .claude/skills/fe-lwc
  npx fe-lwc-skill --target .gemini/skills/fe-lwc --force

Supported runtimes (auto-detected):
${AGENT_RUNTIMES.map((r) => `  ${r.label.padEnd(18)} → ${r.skillPath}`).join("\n")}
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const force = args.includes("--force");
const targetIdx = args.indexOf("--target");

console.log(`\n🔧 fe-lwc-skill installer\n`);

// ── Mode 1: explicit --target ─────────────────────────────────────────────────
if (targetIdx !== -1) {
  const target = args[targetIdx + 1];

  if (!target || target.startsWith("--")) {
    console.error("❌ --target requires a path argument.");
    console.error("   Example: --target .claude/skills/fe-lwc\n");
    process.exit(1);
  }

  install(target, { force });
  process.exit(0);
}

// ── Mode 2: auto-detect ───────────────────────────────────────────────────────
const detected = AGENT_RUNTIMES.filter(({ markerDir }) => existsSync(join(cwd, markerDir)));

if (detected.length === 0) {
  console.log("⚠️  No known agent config directory found in this project.");
  console.log("   Looked for:", AGENT_RUNTIMES.map((r) => r.markerDir).join(", "));
  console.log("");
  console.log("   Use --target to install manually:");
  console.log(`   npx ${SKILL_NAME}-skill --target .claude/skills/${SKILL_NAME}\n`);
  process.exit(1);
}

console.log(`Found ${detected.length} agent runtime(s):\n`);

let installedCount = 0;
for (const runtime of detected) {
  process.stdout.write(`  [${runtime.label}] `);
  const ok = install(runtime.skillPath, { force });
  if (ok) installedCount++;
}

console.log("");
if (installedCount > 0) {
  console.log(`🎉 Done! Installed to ${installedCount} location(s).`);
  console.log(`   The agent will now load LWC rules from the skill directory.\n`);
} else {
  console.log(`Nothing was installed. Run with --force to overwrite existing installs.\n`);
}
