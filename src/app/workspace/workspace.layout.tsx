import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import type { JSX } from "react";
import { Header } from "@/components/layout/header";
import { TitleSection } from "@/components/layout/title-section";
import { itemNavigation } from "@/constants/item-navigation";

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
    <div className="flex min-h-screen">
      <div className="flex-1 flex flex-col">
        <Header
          itemNavigation={itemNavigation}
          activeLink={currentItem.link}
          onNavigate={handleNavigation}
        />

        <TitleSection title={currentItem.titleSection ?? ""} />

        <main className="flex-1 px-30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
