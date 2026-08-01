import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import { roleLabel } from '../lib/roles'
import { useAuth } from '../store/auth'
import type {
  UserResponse,
  UserListResponse,
  AvailableRoleResponse,
  CreateUserRequest,
  UpdateUserRoleRequest,
} from '../lib/types'

function accountName(user: UserResponse | null | undefined) {
  if (!user) return '-'
  return user.full_name || user.email
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<UserResponse[]>([])
  const [roles, setRoles] = useState<AvailableRoleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [form, setForm] = useState<CreateUserRequest>({
    email: '',
    full_name: null,
    password: '',
    role: 'staff',
    is_active: true,
  })

  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [roleError, setRoleError] = useState('')

  const availableRoles = roles.map(r => r.name)
  const defaultRole = availableRoles.find(role => role === 'staff') ?? availableRoles[0] ?? 'staff'
  const canInlineUpdate = currentUser?.role === 'admin'

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [uRes, rRes] = await Promise.all([
        api.get<UserListResponse>('/auth/users'),
        api.get<AvailableRoleResponse[]>('/auth/roles'),
      ])
      setUsers(uRes.data.items)
      setRoles(rRes.data)
      setForm(prev => ({
        ...prev,
        role: rRes.data.find(role => role.name === 'staff')?.name ?? rRes.data[0]?.name ?? 'staff',
      }))
    } catch {
      setError('Khong the tai du lieu tai khoan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const buildCreatePayload = (): CreateUserRequest => ({
    email: form.email,
    full_name: form.full_name,
    password: form.password,
    role: form.role,
    is_active: form.is_active,
  })

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await api.post<UserResponse>('/auth/users', buildCreatePayload())
      setUsers(prev => [...prev, res.data])
      setShowCreateForm(false)
      setForm({
        email: '',
        full_name: null,
        password: '',
        role: defaultRole,
        is_active: true,
      })
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Khong the tao tai khoan.')
    } finally {
      setCreating(false)
    }
  }

  const handleUserAccessChange = async (targetUser: UserResponse, patch: UpdateUserRoleRequest) => {
    setUpdatingUserId(targetUser.user_id)
    setRoleError('')
    try {
      const payload: UpdateUserRoleRequest = {
        role: patch.role ?? targetUser.role,
        is_active: patch.is_active,
      }
      const res = await api.patch<UserResponse>(`/auth/users/${targetUser.user_id}/role`, payload)
      setUsers(prev => prev.map(u => u.user_id === targetUser.user_id ? res.data : u))
    } catch (err: any) {
      setRoleError(err.response?.data?.detail || 'Khong the cap nhat tai khoan.')
    } finally {
      setUpdatingUserId(null)
    }
  }

  return (
    <div className="list-page flex-col">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quan ly tai khoan</h1>
          <p className="page-subtitle">Tong so: {users.length} tai khoan</p>
        </div>
        {availableRoles.length > 0 && (
          <button className="btn btn-primary" onClick={() => setShowCreateForm(v => !v)}>
            <UserPlus size={16} /> Tao tai khoan
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showCreateForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="form-section-title">Tao tai khoan moi</h2>
          {createError && <div className="alert alert-error">{createError}</div>}
          <form onSubmit={handleCreateUser}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ten hien thi *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={form.full_name ?? ''}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value || null }))}
                  placeholder="Ten nhan vien"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Mat khau * (toi thieu 8 ky tu)</label>
                <input
                  type="password"
                  className="form-input"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Vai tro</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{roleLabel(r.name)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  Kich hoat tai khoan ngay
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Huy</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : 'Tao tai khoan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper">
        {roleError && <div className="alert alert-error" style={{ marginBottom: 8 }}>{roleError}</div>}
        {loading ? (
          <div className="loading-center"><span className="loading-spinner" /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Ten hien thi</th>
                <th>Vai tro</th>
                <th>Cap cha</th>
                <th>Trang thai</th>
                <th>Ngay tao</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Khong co tai khoan nao.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.user_id}>
                  <td className="font-medium">{u.email}</td>
                  <td>{u.full_name || '-'}</td>
                  <td>
                    <span className="badge badge-default">{roleLabel(u.role)}</span>
                  </td>
                  <td>{u.parent ? accountName(u.parent as UserResponse) : <span className="text-muted">-</span>}</td>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={u.is_active}
                        disabled={!canInlineUpdate || u.user_id === currentUser?.user_id || updatingUserId === u.user_id}
                        onChange={e => handleUserAccessChange(u, {
                          role: u.role,
                          is_active: e.target.checked,
                        })}
                      />
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {u.is_active ? 'Hoat dong' : 'Vo hieu'}
                      </span>
                    </label>
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(u.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
