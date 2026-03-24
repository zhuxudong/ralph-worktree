import fs from "node:fs";
import chalk from "chalk";
import Table from "cli-table3";
import { ensureRwDir, employeesPath } from "../core/config.js";
import {
  loadEmployees,
  addEmployee,
  removeEmployee,
  type Employee,
} from "../core/employee.js";
import { gitRootDir } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function employeeListCommand() {
  const root = await gitRootDir();
  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const employees = loadEmployees(root);
  if (employees.length === 0) {
    logger.info("暂无数字员工。使用 `rw employee add` 添加。");
    return;
  }

  const table = new Table({
    head: [
      chalk.bold("ID"),
      chalk.bold("名称"),
      chalk.bold("角色"),
      chalk.bold("描述"),
    ],
    colWidths: [18, 16, 16, 40],
    wordWrap: true,
  });

  for (const emp of employees) {
    table.push([emp.id, emp.name, emp.role, emp.description]);
  }

  console.log(table.toString());
  logger.info(`共 ${employees.length} 名数字员工`);
}

export async function employeeAddCommand(
  id: string,
  opts: { name: string; role: string; desc: string; prompt?: string }
) {
  const root = await gitRootDir();
  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const employee: Employee = {
    id,
    name: opts.name,
    role: opts.role,
    description: opts.desc,
    systemPrompt: opts.prompt,
  };

  addEmployee(root, employee);
  logger.success(`已添加数字员工: ${employee.name}（${employee.role}）`);
}

export async function employeeRemoveCommand(id: string) {
  const root = await gitRootDir();
  if (!ensureRwDir(root)) {
    logger.error("未找到 .rw/ 目录，请先运行 `rw init`。");
    process.exit(1);
  }

  const removed = removeEmployee(root, id);
  if (removed) {
    logger.success(`已删除数字员工: ${id}`);
  } else {
    logger.error(`未找到 ID 为 "${id}" 的数字员工`);
  }
}
