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
        `熔断器触发，已执行 ${i} 次循环`
      );
      return { status: "breaker", loops: i };
    }

    logger.task(opts.taskName, `循环 ${i + 1}/${opts.maxLoops}`);

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
          `退出: ${agentStatus.status} - ${agentStatus.summary}`
        );
        return {
          status: agentStatus.status === "BLOCKED" ? "failed" : "done",
          loops: i + 1,
          summary: agentStatus.summary,
        };
      }
    } catch (err: any) {
      logger.task(opts.taskName, `循环 ${i + 1} 出错: ${err.message}`);
      breaker.record({ hasChanges: false, error: err.message });
    }
  }

  logger.task(opts.taskName, `已达最大循环次数（${opts.maxLoops}）`);
  return { status: "failed", loops: opts.maxLoops };
}

async function callClaude(opts: AgentLoopOptions): Promise<string> {
  const args = [
    "--print",
    opts.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--max-turns",
    "25",
  ];

  if (opts.allowedTools?.length) {
    for (const tool of opts.allowedTools) {
      args.push("--allowedTools", tool);
    }
  }

  const proc = execa("claude", args, {
    cwd: opts.cwd,
    timeout: opts.timeoutMs,
    stdin: "ignore",
    env: {
      ...process.env,
      CLAUDE_CODE_ENTRYPOINT: "ralph-worktree",
    },
  });

  let fullText = "";

  // Parse stream-json for real-time progress
  if (proc.stdout) {
    proc.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk.toString().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text") {
                fullText += block.text;
              }
            }
          } else if (event.type === "result" && event.result) {
            // Final result text
            fullText = event.result;
          }
          // Log tool usage for visibility
          if (event.type === "assistant" && event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "tool_use") {
                logger.task(opts.taskName, `  → ${block.name}`);
              }
            }
          }
        } catch {
          // non-JSON line, ignore
        }
      }
    });
  }

  await proc;
  return fullText;
}
