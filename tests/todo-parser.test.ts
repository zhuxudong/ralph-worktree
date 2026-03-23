import { describe, it, expect } from "vitest";
import { parseTodo } from "../src/core/todo-parser.js";

describe("parseTodo", () => {
  it("parses all task statuses", () => {
    const content = `# Tasks

- [ ] fix-camera: Fix camera FOV conversion
- [~] refactor-utils: Extract shared utils
- [x] fix-shadow: Fix shadow mapping
- [!] broken-task: This task failed
`;

    const tasks = parseTodo(content);
    expect(tasks).toHaveLength(4);

    expect(tasks[0]).toEqual({
      name: "fix-camera",
      description: "Fix camera FOV conversion",
      status: "pending",
    });
    expect(tasks[1]).toEqual({
      name: "refactor-utils",
      description: "Extract shared utils",
      status: "running",
    });
    expect(tasks[2]).toEqual({
      name: "fix-shadow",
      description: "Fix shadow mapping",
      status: "done",
    });
    expect(tasks[3]).toEqual({
      name: "broken-task",
      description: "This task failed",
      status: "failed",
    });
  });

  it("returns empty for no tasks", () => {
    expect(parseTodo("# Tasks\n\nNothing here")).toEqual([]);
  });

  it("handles trailing content after description", () => {
    const content = `- [ ] task-a: Some description  ← comment`;
    const tasks = parseTodo(content);
    expect(tasks[0].description).toContain("comment");
  });
});
