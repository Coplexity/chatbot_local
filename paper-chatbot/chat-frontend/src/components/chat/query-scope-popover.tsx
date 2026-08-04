import { useState, useEffect, useRef } from "react";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";

interface QueryScopeUser {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
}

const ROLE_LABELS: Record<string, string> = {
  health_department: "Sở y tế",
  hospital: "Bệnh viện",
  doctor: "Bác sĩ",
};

interface QueryScopePopoverProps {
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

const STORAGE_KEY = "query_scope_user_ids";

export function QueryScopePopover({
  selectedUserIds,
  onChange,
  disabled,
}: QueryScopePopoverProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [ancestors, setAncestors] = useState<QueryScopeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setUnauthorized(false);
    userService.getAncestors()
      .then((data) => {
        setAncestors(data);
      })
      .catch((err: any) => {
        if (err?.status === 401 || err?.status === 403) {
          setUnauthorized(true);
        } else {
          console.error("Failed to fetch ancestors:", err);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggleAncestor = (userId: string) => {
    const next = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onChange(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter(Boolean)));
  };

  const currentUserId = user?.documentUserId ?? "";
  const currentUserDisplay =
    user?.fullName || user?.email || "Tài khoản hiện tại";
  const hasAncestors = ancestors.length > 0;
  const badgeCount = selectedUserIds.length;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-label="Phạm vi"
        className="
          appearance-none bg-white border border-slate-200 text-slate-700
          text-sm font-medium rounded-full px-3 py-1.5
          cursor-pointer transition-all duration-200
          hover:border-slate-300 hover:text-slate-800
          focus:border-[#4c82e8] focus:outline-none focus:ring-1 focus:ring-[#4c82e8]/30
          disabled:opacity-40 disabled:cursor-not-allowed
          inline-flex items-center gap-1.5
        "
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
        <span>Phạm vi</span>
        {badgeCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#4c82e8] rounded-full">
            {badgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="
            absolute left-0 bottom-full mb-2 z-50
            w-72 bg-white rounded-xl border border-slate-200
            shadow-lg shadow-slate-200/50
            overflow-hidden
          "
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">
              Chọn phạm vi tra cứu
            </h3>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {unauthorized ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Cần đăng nhập để chọn phạm vi
              </div>
            ) : loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Đang tải...
              </div>
            ) : !hasAncestors && !currentUserId ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Không có cấp trên
              </div>
            ) : (
              <div>
                {currentUserId && (
                  <label className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(currentUserId)}
                      onChange={() => handleToggleAncestor(currentUserId)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#4c82e8] focus:ring-[#4c82e8]/30 cursor-pointer accent-[#4c82e8] flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        Tài khoản hiện tại
                      </span>
                      <span className="text-xs text-slate-400 truncate">
                        {currentUserDisplay}
                      </span>
                    </div>
                  </label>
                )}

                {ancestors.map((ancestor) => {
                  const isChecked = selectedUserIds.includes(ancestor.id);
                  return (
                    <label
                      key={ancestor.id}
                      className="
                        flex items-start gap-3 px-4 py-3 cursor-pointer
                        hover:bg-slate-50 transition-colors
                        last:border-b-0 border-b border-slate-100
                      "
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAncestor(ancestor.id)}
                        className="
                          mt-1 h-4 w-4 rounded border-slate-300
                          text-[#4c82e8] focus:ring-[#4c82e8]/30
                          cursor-pointer accent-[#4c82e8] flex-shrink-0
                        "
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate">
                          {ancestor.fullName || ancestor.email}
                        </span>
                        {ancestor.role && (
                          <span className="text-xs text-slate-400 truncate">
                            {ROLE_LABELS[ancestor.role] || ancestor.role}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}

                {!hasAncestors && currentUserId && (
                  <div className="px-4 py-3 text-xs text-slate-400 text-center">
                    Không có cấp trên
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
