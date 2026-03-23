import { execa } from "execa";
import { CircuitBreaker } from "./circuit-breaker.js";
import { ExitDetector } from "./exit-detector.js";
import { gitHasDiff, gitCommitAll } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export interface AgentLoopOptions {
  cwd: string;
  prompt: string;
  taskName: string;
  maxLoops: number;
  timeoutMs: number;
  allowedTools?: string[];
}

export interface AgentLoopResult {
  status: "done" | "failed" | "breaker";
  loops: number;
  summary?: string;
}

export async function runAgentLoop(
  opts: AgentLoopOptions
): Promise<AgentLoopResult> {
  const breaker = new CircuitBreaker();
  const detector = new ExitDetector();

  for (let i = 0; i < opts.maxLoops; i++) {
    if (breaker.isOpen()) {
      logger.task(
        opts.taskName,
        `Circuit breaker opened after ${i} loops`
      );
      return { status: "breaker", loops: i };
    }

    logger.task(opts.taskName, `Loop ${i + 1}/${opts.maxLoops}`);

    try {
      const response = await callClaude(opts);
      const agentStatus = detector.analyze(response);
      const hasChanges = await gitHasDiff(opts.cwd);

      if (hasChanges) {
        await gitCommitAll(
          `rw(${opts.taskName}): loop ${i + 1} - ${agentStatus.summary || "progress"}`,
          opts.cwd
        );
      }

      breaker.record({ hasChanges, error: agentStatus.error });

      if (detector.shouldExit(agentStatus)) {
        logger.task(
          opts.taskName,
          `Exiting: ${agentStatus.status} - ${agentStatus.summary}`
        );
        return {
          status: agentStatus.status === "BLOCKED" ? "failed" : "done",
          loops: i + 1,
          summary: agentStatus.summary,
        };
      }
    } catch (err: any) {
      logger.task(opts.taskName, `Error in loop ${i + 1}: ${err.message}`);
      breaker.record({ hasChanges: false, error: err.message });
    }
  }

  logger.task(opts.taskName, `Max loops (${opts.maxLoops}) reached`);
  return { status: "failed", loops: opts.maxLoops };
}

async function callClaude(opts: AgentLoopOptions): Promise<string> {
  const args = [
    "--print",
    opts.prompt,
    "--output-format",
    "text",
    "--max-turns",
    "25",
  ];

  if (opts.allowedTools?.length) {
    for (const tool of opts.allowedTools) {
      args.push("--allowedTools", tool);
    }
  }

  const result = await execa("claude", args, {
    cwd: opts.cwd,
    timeout: opts.timeoutMs,
    env: {
      ...process.env,
      CLAUDE_CODE_ENTRYPOINT: "ralph-worktree",
    },
  });

  return result.stdout;
}
