import { useEffect, useState } from "react";
import { App, Select } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";
import { UserRole } from "@/types/api-types";
import Icons from "../icons/icons";

const ROLE_OPTIONS = [
  { label: "Role: None", value: UserRole.NONE },
  { label: "Nhân viên y tế", value: UserRole.NHAN_VIEN_Y_TE },
  { label: "Bác sĩ trạm y tế", value: UserRole.BAC_SI_TRAM_Y_TE },
  { label: "Bác sĩ BV chuyên sâu", value: UserRole.BAC_SI_BENH_VIEN_CHUYEN_SAU },
];

export function TitleSection({ onMenuClick }: { onMenuClick?: () => void }) {
  const { message } = App.useApp();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role ?? UserRole.NONE);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  useEffect(() => {
    setSelectedRole(user?.role ?? UserRole.NONE);
  }, [user?.role]);

  const handleRoleChange = async (nextRole: UserRole) => {
    if (!isAuthenticated || nextRole === selectedRole) {
      return;
    }

    const previousRole = selectedRole;
    setSelectedRole(nextRole);
    setIsUpdatingRole(true);

    try {
      await authService.updateUserRole(nextRole);
      await refreshUser();
      message.success("Cập nhật role thành công");
    } catch (error) {
      console.error("Failed to update user role:", error);
      setSelectedRole(previousRole);
      message.error("Không thể cập nhật role");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-3 lg:px-6 lg:pt-6 lg:pb-4 w-full bg-bg-app flex items-center justify-between">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-full hover:bg-white transition-colors"
          aria-label="Open menu"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h2 className="text-[1.75rem] leading-none font-extrabold tracking-[-0.03em] text-slate-700">
          Chatbot Y tế
        </h2>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* {isAuthenticated ? (
          <Select
            aria-label="Select role"
            className="min-w-48"
            value={selectedRole}
            options={ROLE_OPTIONS}
            onChange={handleRoleChange}
            loading={isUpdatingRole}
            disabled={isUpdatingRole}
            size="middle"
          />
        ) : null} */}
        <button type="button" className="p-2 rounded-full text-slate-500 hover:bg-white transition-colors cursor-pointer">
          <Icons.UploadIcon className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
        <button type="button" className="p-2 rounded-full text-slate-500 hover:bg-white transition-colors cursor-pointer">
          <Icons.Copy className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}
