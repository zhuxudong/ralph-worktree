import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { runCommand } from "./commands/run.js";
import { listCommand } from "./commands/list.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { cleanCommand } from "./commands/clean.js";
import { mergeCommand } from "./commands/merge.js";

const program = new Command();

program
  .name("rw")
  .description(
    "ralph-worktree: Multi-task parallel autonomous development with git worktree isolation"
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialize .rw/ directory in the current git repository")
  .action(initCommand);

program
  .command("run [task]")
  .description("Execute pending tasks (or a specific task) with Claude agents")
  .option("--base <branch>", "Base branch for worktrees")
  .option("-c, --concurrency <n>", "Max parallel tasks", "3")
  .option("--max-loops <n>", "Max agent loops per task", "20")
  .option("--timeout <minutes>", "Timeout per agent call in minutes", "15")
  .action((task, opts) =>
    runCommand(task, {
      base: opts.base,
      concurrency: parseInt(opts.concurrency, 10),
      maxLoops: parseInt(opts.maxLoops, 10),
      timeout: parseInt(opts.timeout, 10),
    })
  );

program
  .command("list")
  .alias("ls")
  .description("Show task status table")
  .action(listCommand);

program
  .command("add <input>")
  .description('Add a task to TODO.md (format: "task-name: description")')
  .action(addCommand);

program
  .command("remove <name>")
  .alias("rm")
  .description("Remove a task from TODO.md")
  .action(removeCommand);

program
  .command("clean")
  .description("Remove all worktrees and their branches")
  .action(cleanCommand);

program
  .command("merge")
  .description("Merge completed task branches into target")
  .option("--into <branch>", "Target branch to merge into")
  .action((opts) => mergeCommand({ into: opts.into }));

program.parse();
