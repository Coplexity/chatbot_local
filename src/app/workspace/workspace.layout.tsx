import { Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { JSX } from "react";
import { TitleSection } from "@/components/layout/title-section";
import Navigation from "@/components/layout/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";

export function WorkspaceLayout(): JSX.Element | null {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, isGuest, isLoading, continueAsGuest } = useAuth();

  // Auto-enable guest mode only when not authenticated AND no token exists
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isGuest && !authService.hasToken()) {
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

  // If not authenticated, not guest, and no token - don't render
  // If token exists, allow render (user will be fetched/already logged in)
  if (!isAuthenticated && !isGuest && !authService.hasToken()) {
    return null;
  }

  return (
    <div className="flex h-screen bg-bg-app text-slate-700 overflow-hidden">
      {/* Desktop sidebar - always visible on desktop */}
      <aside className="hidden lg:block lg:w-[328px] lg:shrink-0 bg-bg-aside">
        <Navigation />
      </aside>

      {/* Mobile navigation - only on mobile screens */}
      <div className="lg:hidden">
        <Navigation
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col w-full h-screen overflow-hidden">
        <TitleSection onMenuClick={() => setIsMobileMenuOpen(true)} />

        <div className="bg-bg-app flex-1 overflow-hidden min-h-0 px-3 pb-3 lg:px-6 lg:pb-6">
          <main className="h-full border border-design-border bg-bg-main rounded-[2rem] overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
