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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white p-3 text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

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
      const { data } = await supabase.from('contacts').select('*')
      setContacts((data || []) as ContactRow[])
      setLoading(false)
    }

    loadContacts()
  }, [checkingAuth])

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      return (
        c.company === company &&
        (!searchName ||
          c.name.toLowerCase().includes(searchName.toLowerCase())) &&
        (!titleFilter || c.title === titleFilter)
      )
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

  const handleSave = async () => {
    if (!form.name || !form.title) {
      setMessage('Name and Title required')
      return
    }

    let photoUrl = null
    let photoPath = null

    if (file) {
      const id = editingId || crypto.randomUUID()
      const path = `${company}/${id}.jpg`

      await supabase.storage.from('employee-photos').upload(path, file, {
        upsert: true
      })

      const { data } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(path)

      photoUrl = data.publicUrl
      photoPath = path
    }

    const payload = {
      ...form,
      company,
      photo_url: photoUrl,
      photo_path: photoPath
    }

    if (editingId) {
      await supabase.from('contacts').update(payload).eq('id', editingId)
      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c))
      )
    } else {
      const { data } = await supabase
        .from('contacts')
        .insert([payload])
        .select()
        .single()

      setContacts((prev) => [...prev, data as ContactRow])
    }

    resetForm()
  }

  const handleDelete = async (contact: ContactRow) => {
    await supabase.from('contacts').delete().eq('id', contact.id)
    setContacts((prev) => prev.filter((c) => c.id !== contact.id))
  }

  if (checkingAuth) return <p>Checking login...</p>

  return (
    <main className={`min-h-screen p-6 text-white ${pageBackground}`}>
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6 flex justify-between">
          <h1 className="text-3xl font-bold">Contact List</h1>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-white text-black px-4 py-2 rounded"
            >
              Dashboard
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-white text-black px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>
        </div>

        {/* COMPANY SWITCH */}
        <div className="mb-4 flex gap-3">
          <button onClick={() => setCompany('Preload')} className="bg-white text-black px-3 py-1 rounded">
            Preload
          </button>
          <button onClick={() => setCompany('Caldwell')} className="bg-white text-black px-3 py-1 rounded">
            Caldwell
          </button>
        </div>

        {/* VIEW TOGGLE */}
        <div className="mb-4 flex gap-3">
          <button onClick={() => setViewMode('grid')} className="bg-white text-black px-3 py-1 rounded">
            Cards
          </button>
          <button onClick={() => setViewMode('table')} className="bg-white text-black px-3 py-1 rounded">
            Table
          </button>
        </div>

        {/* FILTERS */}
        <div className="mb-4 flex gap-3">
          <input
            placeholder="Search name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={inputClass}
          />

          <select
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All</option>
            {titleOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* CONTENT */}
        {loading ? (
          <p>Loading...</p>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-3 gap-4">
            {filteredContacts.map((c) => (
              <div key={c.id} className="bg-white text-black p-4 rounded">
                {c.photo_url && <img src={c.photo_url} className="h-40 w-full object-cover" />}
                <h2 className="font-bold">{c.name}</h2>
                <p>{c.title}</p>
                <button onClick={() => handleDelete(c)} className="text-red-600">Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full bg-white text-black">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>
    </main>
  )
}