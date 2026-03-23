import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";

export class Logger {
  private logDir: string | null = null;
  private taskName: string | null = null;

  setTask(logDir: string, taskName: string) {
    this.logDir = logDir;
    this.taskName = taskName;
    fs.mkdirSync(logDir, { recursive: true });
  }

  info(msg: string) {
    const line = `${chalk.blue("ℹ")} ${msg}`;
    console.log(line);
    this.appendLog(msg);
  }

  success(msg: string) {
    const line = `${chalk.green("✔")} ${msg}`;
    console.log(line);
    this.appendLog(msg);
  }

  warn(msg: string) {
    const line = `${chalk.yellow("⚠")} ${msg}`;
    console.log(line);
    this.appendLog(msg);
  }

  error(msg: string) {
    const line = `${chalk.red("✖")} ${msg}`;
    console.error(line);
    this.appendLog(`ERROR: ${msg}`);
  }

  task(taskName: string, msg: string) {
    const line = `${chalk.cyan(`[${taskName}]`)} ${msg}`;
    console.log(line);
    this.appendLog(`[${taskName}] ${msg}`, taskName);
  }

  private appendLog(msg: string, taskName?: string) {
    if (!this.logDir) return;
    const name = taskName ?? this.taskName ?? "general";
    const logFile = path.join(this.logDir, `${name}.log`);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
  }
}

export const logger = new Logger();
