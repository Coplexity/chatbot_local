import { UserRole } from "@/types/api-types";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: UserRole.NHAN_VIEN_Y_TE, label: "Nhân viên y tế" },
  { value: UserRole.BAC_SI_TRAM_Y_TE, label: "Bác sĩ trạm y tế" },
  { value: UserRole.BAC_SI_BENH_VIEN_CHUYEN_SAU, label: "Bác sĩ BV chuyên sâu" },
];

interface RoleSelectProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
}

export function RoleSelect({ value, onChange, disabled }: RoleSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      disabled={disabled}
      aria-label="Chọn vai trò"
      className="
        appearance-none bg-white border border-slate-200 text-slate-700
        text-sm font-medium rounded-full px-3 py-1.5
        cursor-pointer transition-all duration-200
        hover:border-slate-300 hover:text-slate-800
        focus:border-[#4c82e8] focus:outline-none focus:ring-1 focus:ring-[#4c82e8]/30
        disabled:opacity-40 disabled:cursor-not-allowed
      "
    >
      {ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
