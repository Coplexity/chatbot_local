import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import { TitleSection } from "@/components/layout/title-section";
import Navigation from "@/components/layout/navigation";

export function WorkspaceLayout(): JSX.Element {
  return (
    <div className="flex h-screen bg-bg-app">
      <aside className="w-1/5 bg-bg-aside">
        <Navigation />
      </aside>

      <div className="flex-1 flex flex-col">
        <TitleSection />

        <div className="bg-bg-app flex-1 overflow-hidden">
          <main className="h-full border border-design-border bg-bg-main rounded-t-3xl shadow-sm">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
