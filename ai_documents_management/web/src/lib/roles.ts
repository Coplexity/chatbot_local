export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  health_department: 'Sở y tế',
  hospital: 'Bệnh viện',
  doctor: 'Bác sĩ',
  staff: 'Nhân viên',
}

export function roleLabel(role: string | null | undefined) {
  if (!role) return '-'
  return ROLE_LABELS[role] ?? role
}
