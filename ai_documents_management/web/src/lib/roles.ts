export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Nhân viên',
}

export function roleLabel(role: string | null | undefined) {
  if (!role) return '-'
  return ROLE_LABELS[role] ?? role
}
