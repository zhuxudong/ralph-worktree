import fs from "node:fs";
import path from "node:path";

export const RW_DIR = ".rw";

export function rwDir(root: string): string {
  return path.join(root, RW_DIR);
}

export function todoPath(root: string): string {
  return path.join(root, RW_DIR, "TODO.md");
}

export function promptPath(root: string): string {
  return path.join(root, RW_DIR, "PROMPT.md");
}

export function rulesPath(root: string): string {
  return path.join(root, RW_DIR, "RULES.md");
}

export function specsDir(root: string): string {
  return path.join(root, RW_DIR, "specs");
}

export function worktreesDir(root: string): string {
  return path.join(root, RW_DIR, "worktrees");
}

export function logsDir(root: string): string {
  return path.join(root, RW_DIR, "logs");
}

export function memoryDir(root: string): string {
  return path.join(root, RW_DIR, "memory");
}

export function statePath(root: string): string {
  return path.join(root, RW_DIR, "state.json");
}

export function readPrompt(root: string): string {
  const p = promptPath(root);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
}

export function readRules(root: string): string {
  const p = rulesPath(root);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
}

export function readSpecs(root: string): string {
  const dir = specsDir(root);
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(dir, f), "utf-8");
      return `### ${f}\n${content}`;
    })
    .join("\n\n");
}

export function readMemory(root: string): string {
  const dir = memoryDir(root);
  if (!fs.existsSync(dir)) return "";
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) return "";
  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(dir, f), "utf-8");
      return `- **${f.replace(".md", "")}**: ${content.trim()}`;
    })
    .join("\n");
}

export function ensureRwDir(root: string): boolean {
  return fs.existsSync(rwDir(root));
}
