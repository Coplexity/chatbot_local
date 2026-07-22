import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, Save } from 'lucide-react'
import { api } from '../lib/api'
import SelectOrCustomInputField from '../components/SelectOrCustomInputField'
import useGuidelineFilterOptions from '../hooks/useGuidelineFilterOptions'
import { useAuth } from '../store/auth'
import type { CreateGuidelineResponse, UserListResponse, UserResponse } from '../lib/types'

export default function InsertPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const filterOptions = useGuidelineFilterOptions()

  const [title, setTitle] = useState('')
  const [loaiVanBan, setLoaiVanBan] = useState('Cấp cơ sở')
  const [donViBanHanh, setDonViBanHanh] = useState('')
  const [chuDe, setChuDe] = useState('')
  const [authors, setAuthors] = useState('')
  const [abstract, setAbstract] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [owners, setOwners] = useState<UserResponse[]>([])
  const [ownerChoice, setOwnerChoice] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'admin') return
    api.get<UserListResponse>('/auth/users')
      .then(res => {
        const availableOwners = res.data.items.filter(item => item.role !== 'admin' && item.is_active)
        setOwners(availableOwners)
        setOwnerChoice(availableOwners[0]?.user_id ? String(availableOwners[0].user_id) : '')
      })
      .catch(() => setError('Không thể tải danh sách tài khoản sở hữu.'))
  }, [user?.role])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Vui lòng chọn file PDF.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('file', file)
      formData.append('loai_van_ban', loaiVanBan)
      if (donViBanHanh) formData.append('don_vi_ban_hanh', donViBanHanh)
      if (chuDe) formData.append('chu_de', chuDe)
      if (abstract) formData.append('abstract', abstract)
      authors.split(',').map(name => name.trim()).filter(Boolean).forEach(name => formData.append('authors', name))
      if (versionLabel) formData.append('version_label', versionLabel)
      if (releaseDate) formData.append('release_date', releaseDate)
      if (user?.role === 'admin') {
        //Đã Thêm && ownerChoice
        if (!ownerChoice) {
          setError('Vui lòng chọn tài khoản sở hữu tài liệu.')
          setLoading(false)
          return
        }
        formData.append('owner_user_id', ownerChoice)
      }

      const res = await api.post<CreateGuidelineResponse>('/guidelines', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      navigate(`/guidelines/${res.data.guideline_id}/versions/${res.data.version_id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Có lỗi xảy ra khi tạo văn bản.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Thêm Guideline mới
          </h1>
          <p className="page-subtitle">Nhập thông tin văn bản và tải lên file PDF</p>
        </div>
        <Link to="/guidelines" className="btn btn-secondary">
          <ChevronLeft size={16} /> Hủy
        </Link>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="form-section-title">Thông tin chung (Metadata)</h2>
            <div className="form-grid">
              {user?.role === 'admin' && (
                <div className="form-group">
                  <label className="form-label">Tài khoản sở hữu *</label>
                  <select
                    className="form-select"
                    
                    value={ownerChoice}
                    onChange={e => setOwnerChoice(e.target.value)}
                  >
                    
                    <option value={ownerChoice}>Tài liệu chung</option>
                    {owners.map(owner => (
                      <option key={owner.user_id} value={owner.user_id}>
                        {owner.full_name || owner.email} - {owner.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group span-full">
                <label className="form-label">Tên văn bản *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ví dụ: Hướng dẫn chẩn đoán và điều trị hen phế quản"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Loại văn bản</label>
                <select className="form-select" value={loaiVanBan} onChange={e => setLoaiVanBan(e.target.value)}>
                  <option value="Cấp cơ sở">Cấp cơ sở</option>
                  <option value="Cấp trung ương">Cấp trung ương</option>
                </select>
              </div>
              <SelectOrCustomInputField
                label="Đơn vị ban hành"
                options={filterOptions.don_vi_ban_hanhs}
                value={donViBanHanh}
                onChange={setDonViBanHanh}
                selectPlaceholder="-- Chọn đơn vị ban hành --"
                customPlaceholder="Nhập đơn vị ban hành"
              />
              <SelectOrCustomInputField
                label="Chủ đề"
                options={filterOptions.chu_des}
                value={chuDe}
                onChange={setChuDe}
                selectPlaceholder="-- Chọn chủ đề --"
                customPlaceholder="Nhập chủ đề"
              />
              <div className="form-group span-full">
                <label className="form-label">Tác giả (phân cách bằng dấu phẩy)</label>
                <input className="form-input" value={authors} onChange={e => setAuthors(e.target.value)} placeholder="Nguyễn Văn A, Trần Thị B" />
              </div>
              <div className="form-group span-full">
                <label className="form-label">Tóm tắt</label>
                <textarea className="form-input" value={abstract} onChange={e => setAbstract(e.target.value)} rows={4} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Thông tin phiên bản xuất bản</h2>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Số hiệu / Nhãn phiên bản</label>
                <input
                  type="text"
                  className="form-input"
                  value={versionLabel}
                  onChange={e => setVersionLabel(e.target.value)}
                  placeholder="Ví dụ: 1234/QĐ-BYT"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ngày ban hành</label>
                <input
                  type="date"
                  className="form-input"
                  value={releaseDate}
                  onChange={e => setReleaseDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section" style={{ marginBottom: 0 }}>
            <h2 className="form-section-title">Tài liệu gốc (PDF) *</h2>
            <label className="form-file-wrapper" style={{ display: 'block' }}>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ color: file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {file ? `Đã chọn: ${file.name}` : 'Click hoặc kéo thả file PDF vào đây'}
              </div>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : <><Save size={16} /> Lưu văn bản</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

