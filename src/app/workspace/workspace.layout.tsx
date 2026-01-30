import { Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { JSX } from "react";
import { TitleSection } from "@/components/layout/title-section";
import Navigation from "@/components/layout/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function WorkspaceLayout(): JSX.Element | null {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isGuest, isLoading, continueAsGuest } = useAuth();

  // Auto-enable guest mode when not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isGuest) {
      continueAsGuest();
    }
  }, [isAuthenticated, isGuest, isLoading, continueAsGuest]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-app">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return (
    <div className="flex h-screen bg-bg-app">
      {/* Desktop sidebar - always visible on desktop */}
      <aside className="hidden lg:block lg:w-1/5 bg-bg-aside">
        <Navigation />
      </aside>

      {/* Mobile navigation - only on mobile screens */}
      <div className="lg:hidden">
        <Navigation
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col w-full lg:w-4/5 min-h-0 overflow-hidden">
        <TitleSection onMenuClick={() => setIsMobileMenuOpen(true)} />

        <div className="bg-bg-app flex-1 overflow-hidden min-h-0">
          <main className="h-full border border-design-border bg-bg-main rounded-t-3xl shadow-sm overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
