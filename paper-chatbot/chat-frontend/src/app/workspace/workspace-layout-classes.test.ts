import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WorkspaceLayout class contract", () => {
  it("locks the workspace shell and main column to the viewport height", () => {
    const file = readFileSync(
      resolve(process.cwd(), "src/app/workspace/workspace.layout.tsx"),
      "utf8"
    );

    expect(file).toContain('className="flex h-screen bg-bg-app text-slate-700 overflow-hidden"');
    expect(file).toContain('className="flex-1 flex flex-col w-full h-screen overflow-hidden"');
    expect(file).not.toContain("flex min-h-screen bg-bg-app text-slate-700");
    expect(file).not.toContain("flex-1 flex flex-col w-full min-h-screen overflow-hidden");
  });
});
