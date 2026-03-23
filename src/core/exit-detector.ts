export interface AgentStatus {
  status: "IN_PROGRESS" | "COMPLETE" | "BLOCKED";
  exitSignal: boolean;
  summary: string;
  error?: string;
}

const STATUS_BLOCK_RE =
  /---RW_STATUS---([\s\S]*?)---END_RW_STATUS---/;

export class ExitDetector {
  analyze(response: string): AgentStatus {
    const match = response.match(STATUS_BLOCK_RE);
    if (!match) {
      return {
        status: "IN_PROGRESS",
        exitSignal: false,
        summary: "No status block found",
      };
    }

    const block = match[1];
    const statusMatch = block.match(/STATUS:\s*(\S+)/);
    const exitMatch = block.match(/EXIT_SIGNAL:\s*(\S+)/);
    const summaryMatch = block.match(/SUMMARY:\s*(.+)/);

    const status = (statusMatch?.[1] ?? "IN_PROGRESS") as AgentStatus["status"];
    const exitSignal = exitMatch?.[1]?.toLowerCase() === "true";
    const summary = summaryMatch?.[1]?.trim() ?? "";

    return {
      status,
      exitSignal,
      summary,
      error: status === "BLOCKED" ? summary : undefined,
    };
  }

  shouldExit(status: AgentStatus): boolean {
    return (
      status.exitSignal ||
      status.status === "COMPLETE" ||
      status.status === "BLOCKED"
    );
  }
}
