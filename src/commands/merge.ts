import fs from "node:fs";
import { execa } from "execa";
import { todoPath, ensureRwDir, readMemory, readRules } from "../core/config.js";
import { parseTodo, updateTaskStatus } from "../core/todo-parser.js";
import MERGE_CONFLICT_PROMPT from "../prompts/merge-conflict.md";
import {
  gitRootDir,
  gitMerge,
  gitMergeAbort,
  gitCurrentBranch,
  gitConflictFiles,
  gitCommitAll,
} from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface MergeOptions {
  into?: string;
}

async function resolveConflictsWithAgent(
  root: string,
  branch: string,
  into: string
): Promise<boolean> {
  const conflictFiles = await gitConflictFiles(root);
  const memory = readMemory(root);
  const rules = readRules(root);

  let prompt = `分支 \`${branch}\` 正在合并到 \`${into}\`。\n\n`;
  prompt += `冲突文件：\n${conflictFiles.map((f) => `- ${f}`).join("\n")}\n\n`;

  if (memory) {
    prompt += `## 已完成任务的上下文（memory）\n${memory}\n\n`;
  }
  if (rules) {
    prompt += `## 规则\n${rules}\n\n`;
  }

  prompt += MERGE_CONFLICT_PROMPT;

  try {
    await execa("claude", ["--print", prompt, "--output-format", "text", "--max-turns", "25"], {
      cwd: root,
      timeout: 10 * 60 * 1000,
      env: {
        ...process.env,
        CLAUDE_CODE_ENTRYPOINT: "ralph-worktree",
      },
    });

    // Check if conflicts are resolved
    const remaining = await gitConflictFiles(root);
    if (remaining.length === 0) {
      await gitCommitAll(`Merge ${branch} into ${into} (conflicts resolved by rw)`, root);
      return true;
    }

    logger.error(`仍有 ${remaining.length} 个文件存在冲突`);
    return false;
  } catch (err: any) {
    logger.error(`agent 解决冲突失败: ${err.message}`);
    return false;
  }
}

export async function mergeCommand(opts: MergeOptions = {}) {
  const root = await gitRootDir();

  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const into = opts.into ?? (await gitCurrentBranch());
  const td = todoPath(root);
  const content = fs.readFileSync(td, "utf-8");
  const tasks = parseTodo(content);

  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === 0) {
    logger.info("没有已完成的任务可合并。");
    return;
  }

  logger.info(`正在将 ${doneTasks.length} 个已完成分支合并到 ${into}`);

  for (const task of doneTasks) {
    const branch = `rw/${task.name}`;
    logger.info(`正在合并 ${branch}...`);

    const result = await gitMerge(branch, into, root);
    if (result.success) {
      updateTaskStatus(td, task.name, "merged");
      logger.success(`已合并 ${branch} 到 ${into}`);
      continue;
    }

    if (result.conflict) {
      logger.warn(`合并 ${branch} 有冲突，正在调用 agent 解决...`);
      const resolved = await resolveConflictsWithAgent(root, branch, into);
      if (resolved) {
        updateTaskStatus(td, task.name, "merged");
        logger.success(`已合并 ${branch} 到 ${into}（冲突已由 agent 解决）`);
      } else {
        await gitMergeAbort(root);
        logger.error(`合并 ${branch} 失败：agent 无法解决冲突，已 abort`);
        logger.info(`  手动解决: git merge ${branch} --no-ff`);
      }
    } else {
      logger.error(`合并 ${branch} 失败: ${result.error}`);
    }
  }
}
