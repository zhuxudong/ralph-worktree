import { execa } from "execa";

export async function gitRootDir(cwd?: string): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--show-toplevel"], {
    cwd,
  });
  return stdout.trim();
}

export async function gitCurrentBranch(cwd?: string): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd,
  });
  return stdout.trim();
}

export async function gitWorktreeAdd(
  wtPath: string,
  branch: string,
  base: string,
  cwd?: string
): Promise<void> {
  await execa("git", ["worktree", "add", wtPath, "-b", branch, base], { cwd });
}

export async function gitWorktreeRemove(
  wtPath: string,
  cwd?: string
): Promise<void> {
  await execa("git", ["worktree", "remove", wtPath, "--force"], { cwd });
}

export async function gitWorktreeList(
  cwd?: string
): Promise<{ path: string; branch: string }[]> {
  const { stdout } = await execa("git", ["worktree", "list", "--porcelain"], {
    cwd,
  });
  const entries: { path: string; branch: string }[] = [];
  let current: Partial<{ path: string; branch: string }> = {};
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      current.path = line.slice("worktree ".length);
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace("refs/heads/", "");
    } else if (line === "") {
      if (current.path && current.branch) {
        entries.push({ path: current.path, branch: current.branch });
      }
      current = {};
    }
  }
  if (current.path && current.branch) {
    entries.push({ path: current.path, branch: current.branch });
  }
  return entries;
}

export async function gitHasDiff(cwd: string): Promise<boolean> {
  const { stdout } = await execa("git", ["status", "--porcelain"], { cwd });
  return stdout.trim().length > 0;
}

export async function gitCommitAll(
  message: string,
  cwd: string
): Promise<void> {
  await execa("git", ["add", "-A"], { cwd });
  await execa("git", ["commit", "-m", message, "--allow-empty"], { cwd });
}

export async function gitBranchDelete(
  branch: string,
  cwd?: string
): Promise<void> {
  try {
    await execa("git", ["branch", "-D", branch], { cwd });
  } catch {
    // branch may not exist
  }
}

export async function gitMerge(
  branch: string,
  into: string,
  cwd?: string
): Promise<{ success: boolean; conflict?: boolean; error?: string }> {
  try {
    // Stash any uncommitted changes (e.g. generated CLAUDE.md) before merge
    const { stdout: status } = await execa("git", ["status", "--porcelain"], { cwd });
    const needStash = status.trim().length > 0;
    if (needStash) {
      await execa("git", ["stash", "push", "-m", "rw-merge-auto-stash"], { cwd });
    }

    await execa("git", ["checkout", into], { cwd });
    await execa("git", ["merge", branch, "--no-ff", "-m", `Merge ${branch} into ${into}`], { cwd });

    if (needStash) {
      await execa("git", ["stash", "pop"], { cwd }).catch(() => {});
    }
    return { success: true };
  } catch (err: any) {
    const conflict = err.message?.includes("CONFLICT") || err.message?.includes("fix conflicts");
    return { success: false, conflict, error: err.message };
  }
}

export async function gitMergeAbort(cwd?: string): Promise<void> {
  try {
    await execa("git", ["merge", "--abort"], { cwd });
  } catch {
    // may not be in a merge state
  }
}

export async function gitConflictFiles(cwd?: string): Promise<string[]> {
  const { stdout } = await execa("git", ["diff", "--name-only", "--diff-filter=U"], { cwd });
  return stdout.trim().split("\n").filter(Boolean);
}

export async function addToGitExclude(
  gitRoot: string,
  pattern: string
): Promise<void> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const excludePath = path.join(gitRoot, ".git", "info", "exclude");
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  const content = fs.existsSync(excludePath)
    ? fs.readFileSync(excludePath, "utf-8")
    : "";
  if (!content.includes(pattern)) {
    fs.appendFileSync(excludePath, `\n${pattern}\n`);
  }
}
