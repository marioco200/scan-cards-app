'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

type SubmissionImage = {
  submission_id?: string
  file_url: string | null
  file_name: string | null
}

type SubmissionRow = {
  id: string
  name: string | null
  location: string | null
  superintendent: string | null
  what_happened: string | null
  fixed_problem: boolean | null
  corrective_actions: string | null
  status: string | null
  submitted_at: string
  submission_images: SubmissionImage[]
}

export default function DashboardPage() {
  const router = useRouter()

  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [superintendentFilter, setSuperintendentFilter] = useState('')
  const [fixedFilter, setFixedFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [selectedImage, setSelectedImage] = useState<{
    url: string
    name: string
  } | null>(null)

  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null)

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

    const loadRows = async () => {
      setLoading(true)

      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          name,
          location,
          superintendent,
          what_happened,
          fixed_problem,
          corrective_actions,
          status,
          submitted_at
        `)
        .order('submitted_at', { ascending: false })

      if (submissionsError) {
        console.error('Submissions error:', submissionsError)
        setLoading(false)
        return
      }

      const { data: images, error: imagesError } = await supabase
        .from('submission_images')
        .select('submission_id, file_url, file_name')

      if (imagesError) {
        console.error('Images error:', imagesError)
        setLoading(false)
        return
      }

      const merged = (submissions || []).map((submission) => {
        const matchedImages = (images || []).filter(
          (img) => String(img.submission_id) === String(submission.id)
        )

        return {
          ...submission,
          submission_images: matchedImages
        }
      })

      setRows(merged as SubmissionRow[])
      setLoading(false)
    }

    loadRows()
  }, [checkingAuth])

  const uniqueLocations = useMemo(() => {
    const values = rows
      .map((r) => r.location?.trim())
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(values)).sort()
  }, [rows])

  const uniqueSuperintendents = useMemo(() => {
    const values = rows
      .map((r) => r.superintendent?.trim())
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(values)).sort()
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const searchText = search.toLowerCase()

      const matchesSearch =
        !search ||
        row.name?.toLowerCase().includes(searchText) ||
        row.location?.toLowerCase().includes(searchText) ||
        row.superintendent?.toLowerCase().includes(searchText) ||
        row.what_happened?.toLowerCase().includes(searchText)

      const matchesLocation =
        !locationFilter || row.location === locationFilter

      const matchesSuperintendent =
        !superintendentFilter || row.superintendent === superintendentFilter

      const matchesFixed =
        fixedFilter === 'all' ||
        (fixedFilter === 'yes' && row.fixed_problem === true) ||
        (fixedFilter === 'no' && row.fixed_problem === false)

      const rowDate = new Date(row.submitted_at)

      const matchesStartDate =
        !startDate || rowDate >= new Date(`${startDate}T00:00:00`)

      const matchesEndDate =
        !endDate || rowDate <= new Date(`${endDate}T23:59:59`)

      return (
        matchesSearch &&
        matchesLocation &&
        matchesSuperintendent &&
        matchesFixed &&
        matchesStartDate &&
        matchesEndDate
      )
    })
  }, [
    rows,
    search,
    locationFilter,
    superintendentFilter,
    fixedFilter,
    startDate,
    endDate
  ])

  const recentActivity = useMemo(() => {
    return [...rows].slice(0, 5)
  }, [rows])

  const totalReports = filteredRows.length
  const fixedCount = filteredRows.filter((r) => r.fixed_problem === true).length
  const notFixedCount = filteredRows.filter((r) => r.fixed_problem === false).length
  const withPhotosCount = filteredRows.filter(
    (r) => r.submission_images && r.submission_images.length > 0
  ).length

  const fixedPieData = [
    { name: 'Fixed', value: fixedCount },
    { name: 'Not Fixed', value: notFixedCount }
  ]

  const reportsByLocation = Object.values(
    filteredRows.reduce((acc, row) => {
      const key = row.location || 'Unknown'
      if (!acc[key]) {
        acc[key] = { name: key, count: 0 }
      }
      acc[key].count += 1
      return acc
    }, {} as Record<string, { name: string; count: number }>)
  )

  const reportsBySuperintendent = Object.values(
    filteredRows.reduce((acc, row) => {
      const key = row.superintendent || 'Unknown'
      if (!acc[key]) {
        acc[key] = { name: key, count: 0 }
      }
      acc[key].count += 1
      return acc
    }, {} as Record<string, { name: string; count: number }>)
  )

  const reportsOverTime = Object.values(
    filteredRows.reduce((acc, row) => {
      const date = new Date(row.submitted_at).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = { date, count: 0 }
      }
      acc[date].count += 1
      return acc
    }, {} as Record<string, { date: string; count: number }>)
  )

 const inputClass =
  'w-full rounded-lg border border-gray-400 bg-white p-3 text-black placeholder:text-gray-500 [color:black] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-green-800 p-6 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-lg font-medium">Checking login...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-900 via-red-700 to-green-800 p-6 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">SCAN Cards</h1>
            <p className="text-white/90">
              Review reports, analytics, photos, and recent activity.
            </p>
          </div>

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

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white/95 p-5 shadow">
            <p className="text-sm text-gray-500">Total Reports</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{totalReports}</p>
          </div>

          <div className="rounded-2xl bg-green-50 p-5 shadow">
            <p className="text-sm text-gray-500">Fixed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{fixedCount}</p>
          </div>

          <div className="rounded-2xl bg-red-50 p-5 shadow">
            <p className="text-sm text-gray-500">Not Fixed</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{notFixedCount}</p>
          </div>

          <div className="rounded-2xl bg-white/95 p-5 shadow">
            <p className="text-sm text-gray-500">With Photos</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{withPhotosCount}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Reports by Location</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsByLocation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#374151" />
                  <YAxis allowDecimals={false} stroke="#374151" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Fixed vs Not Fixed</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fixedPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#dc2626" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Reports by Superintendent</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsBySuperintendent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#374151" />
                  <YAxis allowDecimals={false} stroke="#374151" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Reports Over Time</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#374151" />
                  <YAxis allowDecimals={false} stroke="#374151" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Filters</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input
              type="text"
              placeholder="Search name, location, superintendent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />

            <select
              value={locationFilter}
  onChange={(e) => setLocationFilter(e.target.value)}
  className={`${inputClass} text-black`}
            >
              <option value="">All locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>

            <select
              value={superintendentFilter}
              onChange={(e) => setSuperintendentFilter(e.target.value)}
              className={`${inputClass} text-black`}
            >
              <option value="">All superintendents</option>
              {uniqueSuperintendents.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>

            <select
              value={fixedFilter}
              onChange={(e) => setFixedFilter(e.target.value)}
              className={`${inputClass} text-black`}
            >
              <option value="all">All reports</option>
              <option value="yes">Fixed</option>
              <option value="no">Not fixed</option>
            </select>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClass} text-black`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setLocationFilter('')
                setSuperintendentFilter('')
                setFixedFilter('all')
                setStartDate('')
                setEndDate('')
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{row.name || 'No name'}</p>
                    <p className="text-sm text-gray-500">
                      {row.location || 'No location'} • {row.superintendent || 'No superintendent'}
                    </p>
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(row.submitted_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-white">Loading submissions...</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-white">No submissions found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row) => {
              const image = row.submission_images?.[0]
              const isUnresolved = row.fixed_problem === false

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedSubmission(row)}
                  className={`overflow-hidden rounded-2xl border-2 text-left shadow transition hover:shadow-lg ${
                    isUnresolved
                      ? 'border-red-600 bg-red-50'
                      : 'border-green-600 bg-green-50'
                  }`}
                >
                  {image?.file_url ? (
                    <img
                      src={image.file_url}
                      alt={image.file_name || 'Submission photo'}
                      className="h-56 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-56 items-center justify-center bg-gray-200 text-gray-500">
                      No photo
                    </div>
                  )}

                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {row.name || 'No name'}
                        </h2>
                        <p className="text-base font-medium text-blue-700">
                          {row.location || 'No location'}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.fixed_problem === true
                            ? 'bg-green-100 text-green-700'
                            : row.fixed_problem === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {row.fixed_problem === true
                          ? 'Fixed'
                          : row.fixed_problem === false
                          ? 'Not Fixed'
                          : 'Unknown'}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700">
                      <p>
                        <span className="font-medium">Superintendent:</span>{' '}
                        {row.superintendent || '—'}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        {row.status || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm font-medium text-gray-900">What happened?</p>
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {row.what_happened || '—'}
                      </p>
                    </div>

                    <p className="text-xs text-gray-400">
                      Submitted: {new Date(row.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selectedSubmission && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setSelectedSubmission(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSubmission.name || 'No name'}
                  </h2>
                  <p className="text-lg font-medium text-blue-700">
                    {selectedSubmission.location || 'No location'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>

              {selectedSubmission.submission_images?.[0]?.file_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage({
                      url: selectedSubmission.submission_images[0].file_url || '',
                      name:
                        selectedSubmission.submission_images[0].file_name ||
                        'Submission photo'
                    })
                  }
                  className="mb-6 block w-full"
                >
                  <img
                    src={selectedSubmission.submission_images[0].file_url || ''}
                    alt={
                      selectedSubmission.submission_images[0].file_name ||
                      'Submission photo'
                    }
                    className="max-h-[420px] w-full rounded-xl object-cover"
                  />
                </button>
              ) : (
                <div className="mb-6 flex h-64 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
                  No photo
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">Superintendent</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.superintendent || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">Fixed problem</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.fixed_problem === true
                      ? 'Yes'
                      : selectedSubmission.fixed_problem === false
                      ? 'No'
                      : 'Unknown'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">What happened?</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.what_happened || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Corrective actions</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.corrective_actions || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Submitted</p>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-5xl">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-[85vh] max-w-full rounded-xl"
              />
              <p className="mt-3 text-center text-sm text-white">
                {selectedImage.name}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}