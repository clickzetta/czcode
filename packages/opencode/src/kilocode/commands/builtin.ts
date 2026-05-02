// czcode_change - new file
// Built-in slash commands that ship inside the CLI binary.
// Content is inlined at compile time via Bun's static import of .md files.
// These commands are always available regardless of working directory.

import SKILL_FIX from "../../../.opencode/command/skill-fix.md"
import SKILL_UPDATE from "../../../.opencode/command/skill-update.md"

export interface BuiltinCommand {
  name: string
  description: string
  template: string
  subtask?: boolean
}

function parseCommand(name: string, content: string): BuiltinCommand {
  // Strip frontmatter and extract fields
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { name, description: "", template: content }
  const front = match[1]
  const body = match[2].trim()
  const desc = front.match(/description:\s*(.+)/)?.[1]?.trim() ?? ""
  const subtask = /subtask:\s*true/.test(front)
  return { name, description: desc, template: body, subtask }
}

export const BUILTIN_COMMANDS: BuiltinCommand[] = [
  parseCommand("skill-fix", SKILL_FIX),
  parseCommand("skill-update", SKILL_UPDATE),
]
