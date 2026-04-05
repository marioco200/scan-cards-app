'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type CompanyType = 'Preload' | 'Caldwell'

type ContactRow = {
  id: string
  company: CompanyType
  name: string
  title: string
  personal_phone: string | null
  work_phone: string | null
  personal_email: string | null
  work_email: string | null
  photo_path: string | null
  photo_url: string | null
  experience: string | null
  created_at?: string
  updated_at?: string
}

const preloadTitles = [
  'Labor',
  'Workman',
  'Craftsman',
  'Lead Person',
  'Tank Builder',
  'Superintendent'
]

const caldwellTitles = [
  'Labor',
  'Bull Ganger',
  'Lead Person (Pusher)',
  'Foreman'
]

export default function ContactsPage() {
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)

  const [company, setCompany] = useState<CompanyType>('Preload')
  const [contacts, setContacts] = useState<ContactRow[]>([])

  const [searchName, setSearchName] = useState('')
  const [titleFilter, setTitleFilter] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    title: '',
    personal_phone: '',
    work_phone: '',
    personal_email: '',
    work_email: '',
    experience: ''
  })

  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const titleOptions = company === 'Preload' ? preloadTitles : caldwellTitles

  const pageBackground =
    company === 'Caldwell'
      ? 'bg-gradient-to-br from-green-900 via-green-700 to-green-500'
      : 'bg-gradient-to-br from-red-900 via-red-700 to-red-500'

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        router.push('/login')
        return
      }

      setCheckingAuth(false)
    }

    checkUser()
  }, [router])

  useEffect(() => {
    if (checkingAuth) return

    const loadContacts = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error(error)
      } else {
        setContacts((data || []) as ContactRow[])
      }

      setLoading(false)
    }

    loadContacts()
  }, [checkingAuth])

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesCompany = contact.company === company
      const matchesName =
        !searchName ||
        contact.name.toLowerCase().includes(searchName.toLowerCase())
      const matchesTitle =
        !titleFilter || contact.title === titleFilter

      return matchesCompany && matchesName && matchesTitle
    })
  }, [contacts, company, searchName, titleFilter])

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      title: '',
      personal_phone: '',
      work_phone: '',
      personal_email: '',
      work_email: '',
      experience: ''
    })
    setFile(null)
    setMessage('')
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const startEdit = (contact: ContactRow) => {
    setEditingId(contact.id)
    setCompany(contact.company)
    setForm({
      name: contact.name || '',
      title: contact.title || '',
      personal_phone: contact.personal_phone || '',
      work_phone: contact.work_phone || '',
      personal_email: contact.personal_email || '',
      work_email: contact.work_email || '',
      experience: contact.experience || ''
    })
    setFile(null)
    setMessage('')
  }

  const handleSave = async () => {
    setMessage('')

    if (!form.name.trim() || !form.title.trim()) {
      setMessage('Name and Title are required.')
      return
    }

    let photoPath: string | null = null
    let photoUrl: string | null = null

    if (editingId) {
      const existing = contacts.find((c) => c.id === editingId)
      photoPath = existing?.photo_path || null
      photoUrl = existing?.photo_url || null
    }

    if (file) {
      const contactId = editingId || crypto.randomUUID()
      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `${company.toLowerCase()}/${contactId}/photo.${fileExt.toLowerCase()}`

      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        setMessage(`Error: ${uploadError.message}`)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath)

      photoPath = filePath
      photoUrl = publicUrlData.publicUrl
    }

    const payload = {
      company,
      name: form.name.trim(),
      title: form.title.trim(),
      personal_phone: form.personal_phone.trim(),
      work_phone: form.work_phone.trim(),
      personal_email: form.personal_email.trim(),
      work_email: form.work_email.trim(),
      experience: form.experience.trim(),
      photo_path: photoPath,
      photo_url: photoUrl
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      if (error) {
        setMessage(`Error: ${error.message}`)
        return
      }

      setContacts((prev) =>
        prev.map((item) => (item.id === editingId ? (data as ContactRow) : item))
      )

      setMessage('Contact updated.')
      resetForm()
      return
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([payload])
      .select()
      .single()

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    setContacts((prev) => [...prev, data as ContactRow])
    setMessage('Contact saved.')
    resetForm()
  }

  const handleDelete = async (contact: ContactRow) => {
    const confirmed = window.confirm(`Delete ${contact.name}?`)
    if (!confirmed) return

    if (contact.photo_path) {
      await supabase.storage.from('employee-photos').remove([contact.photo_path])
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contact.id)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    setContacts((prev) => prev.filter((item) => item.id !== contact.id))

    if (editingId === contact.id) {
      resetForm()
    }
  }

  if (checkingAuth) {
    return (
      <main className={`min-h-screen p-6 text-white ${pageBackground}`}>
        <div className="mx-auto max-w-7xl">
          <p className="text-lg font-medium">Checking login...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-screen p-6 text-white ${pageBackground}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Contact List</h1>
            <p className="text-white/90">
              Manage contacts for Preload and Caldwell.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-gray-100"
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setCompany('Preload')
              setTitleFilter('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              company === 'Preload'
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white'
            }`}
          >
            Preload
          </button>

          <button
            type="button"
            onClick={() => {
              setCompany('Caldwell')
              setTitleFilter('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              company === 'Caldwell'
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white'
            }`}
          >
            Caldwell
          </button>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-black">
              {editingId ? 'Edit Contact' : 'Add Contact'}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">
                  Company
                </label>
                <select
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value as CompanyType)
                    setForm((prev) => ({ ...prev, title: '' }))
                  }}
                  className={inputClass}
                >
                  <option value="Preload">Preload</option>
                  <option value="Caldwell">Caldwell</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Title
                </label>
                <select
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Choose title</option>
                  {titleOptions.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Personal Phone Number
                </label>
                <input
                  type="text"
                  name="personal_phone"
                  value={form.personal_phone}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Work Phone Number
                </label>
                <input
                  type="text"
                  name="work_phone"
                  value={form.work_phone}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Personal Email
                </label>
                <input
                  type="email"
                  name="personal_email"
                  value={form.personal_email}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Work Email
                </label>
                <input
                  type="email"
                  name="work_email"
                  value={form.work_email}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-black">
                  Experience
                </label>
                <textarea
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  className={`${inputClass} min-h-[120px]`}
                />
              </div>
            </div>

            {message && (
              <p className="mt-4 text-sm font-medium text-gray-700">{message}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {editingId ? 'Update Contact' : 'Save Contact'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-black hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-black">Filters</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Name
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className={inputClass}
                  placeholder="Search by name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Title
                </label>
                <select
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All titles</option>
                  {titleOptions.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-white">Loading contacts...</p>
        ) : filteredContacts.length === 0 ? (
          <p className="text-white">No contacts found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="overflow-hidden rounded-2xl bg-white text-left shadow"
              >
                {contact.photo_url ? (
                  <img
                    src={contact.photo_url}
                    alt={contact.name}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center bg-gray-200 text-gray-500">
                    No photo
                  </div>
                )}

                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {contact.name}
                    </h2>
                    <p className="text-base font-medium text-blue-700">
                      {contact.title}
                    </p>
                    <p className="text-sm font-medium text-gray-700">
                      {contact.company}
                    </p>
                  </div>

                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Personal Phone:</span>{' '}
                      {contact.personal_phone || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Work Phone:</span>{' '}
                      {contact.work_phone || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Personal Email:</span>{' '}
                      {contact.personal_email || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Work Email:</span>{' '}
                      {contact.work_email || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-900">
                      Experience
                    </p>
                    <p className="text-sm text-gray-700">
                      {contact.experience || '—'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => startEdit(contact)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(contact)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Erase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}