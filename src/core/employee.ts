import fs from "node:fs";
import { employeesPath } from "./config.js";

export interface Employee {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt?: string;
}

export function loadEmployees(root: string): Employee[] {
  const p = employeesPath(root);
  if (!fs.existsSync(p)) return [];
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return [];
  }
}

export function saveEmployees(root: string, employees: Employee[]): void {
  fs.writeFileSync(employeesPath(root), JSON.stringify(employees, null, 2));
}

export function getEmployee(root: string, id: string): Employee | undefined {
  return loadEmployees(root).find((e) => e.id === id);
}

export function addEmployee(root: string, employee: Employee): void {
  const employees = loadEmployees(root);
  const idx = employees.findIndex((e) => e.id === employee.id);
  if (idx >= 0) {
    employees[idx] = employee;
  } else {
    employees.push(employee);
  }
  saveEmployees(root, employees);
}

export function removeEmployee(root: string, id: string): boolean {
  const employees = loadEmployees(root);
  const filtered = employees.filter((e) => e.id !== id);
  if (filtered.length === employees.length) return false;
  saveEmployees(root, filtered);
  return true;
}

/**
 * Auto-assign an employee based on task description.
 * Simple keyword matching against employee role and description.
 */
export function autoAssign(
  root: string,
  taskDescription: string
): Employee | undefined {
  const employees = loadEmployees(root);
  if (employees.length === 0) return undefined;

  const desc = taskDescription.toLowerCase();
  let bestMatch: Employee | undefined;
  let bestScore = 0;

  for (const emp of employees) {
    let score = 0;
    const keywords = [
      emp.role,
      emp.id,
      ...emp.description.split(/[\s,，、]+/),
    ].filter(Boolean);

    for (const kw of keywords) {
      if (kw && desc.includes(kw.toLowerCase())) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = emp;
    }
  }

  return bestScore > 0 ? bestMatch : undefined;
}
