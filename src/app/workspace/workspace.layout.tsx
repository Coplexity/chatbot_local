import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import { TitleSection } from "@/components/layout/title-section";
import Navigation from "@/components/layout/navigation";

export function WorkspaceLayout(): JSX.Element {
  return (
    <div className="flex h-screen">
      <aside className="w-1/5 bg-gray-100">
        <Navigation />
      </aside>

      <div className="flex-1 flex flex-col">
        <TitleSection />

        <div className="bg-gray-100 flex-1 overflow-hidden">
          <main className="h-full border border-[#EBEBEB] bg-white rounded-t-3xl">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
