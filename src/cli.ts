import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";

import { mergeCommand } from "./commands/merge.js";
import { webCommand } from "./commands/web.js";

const program = new Command();

program
  .name("rw")
  .description(
    "ralph-worktree: 多任务并行自治开发工具，基于 git worktree 隔离 + Claude Code 自主执行"
  )
  .version("0.1.0");

program
  .command("init")
  .description("在当前 git 仓库初始化 .rw/ 目录")
  .action(initCommand);

program
  .command("run [task]")
  .description("执行待办任务（或指定任务），使用 Claude agent 并行处理")
  .option("--base <branch>", "worktree 的基础分支")
  .option("--max-loops <n>", "每个任务最大 agent 循环次数", "20")
  .option("--timeout <minutes>", "单次 agent 调用超时（分钟）", "15")
  .action((task, opts) =>
    runCommand(task, {
      base: opts.base,
      maxLoops: parseInt(opts.maxLoops, 10),
      timeout: parseInt(opts.timeout, 10),
    })
  );

program
  .command("list")
  .alias("ls")
  .description("查看任务状态表格")
  .action(listCommand);

program
  .command("add <input>")
  .description('添加任务到 TODO.md（格式："task-name: 描述"）')
  .action(addCommand);

program
  .command("remove <name>")
  .alias("rm")
  .description("软删除任务（标记为 [-]）")
  .action(removeCommand);

program
  .command("merge")
  .description("将已完成任务的分支合并到目标分支")
  .option("--into <branch>", "目标分支")
  .action((opts) => mergeCommand({ into: opts.into }));

program
  .command("web")
  .description("启动 web 看板（可选 SSH 隧道供外网访问）")
  .option("--port <port>", "HTTP server 端口", "3700")
  .option("--tunnel", "启用 SSH 反向隧道")
  .option("--tunnel-host <host>", "隧道服务器（如 user@server.com）")
  .option("--tunnel-auth <password>", "启用 HTTP Basic Auth（或设置 RW_WEB_PASSWORD 环境变量）")
  .action((opts) =>
    webCommand({
      port: parseInt(opts.port, 10),
      tunnel: !!opts.tunnel,
      tunnelHost: opts.tunnelHost,
      tunnelAuth: opts.tunnelAuth,
    })
  );

program.parse();
