import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import { TitleSection } from "@/components/layout/title-section";
import { itemNavigation } from "@/constants/item-navigation";
import Navigation from "@/components/layout/navigation";

export function WorkspaceLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const currentItem =
    itemNavigation.find((item) => item.link === location.pathname) ||
    itemNavigation[0];

  const handleNavigation = (link: string) => {
    navigate({ to: link });
  };

  return (
    <div className="flex h-screen">
      <aside className="w-1/5 bg-gray-100">
        <Navigation />
      </aside>

      <div className="flex-1 flex flex-col">
        <TitleSection />

        <div className="bg-gray-100 flex-1 overflow-hidden">
          <main className="h-full p-6 border border-[#EBEBEB] bg-white rounded-t-3xl">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
