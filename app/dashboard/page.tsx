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
  company: string | null
  report_date: string | null
  name: string | null
  division: string | null
  location: string | null
  superintendent: string | null
  supervisor: string | null
  what_happened: string | null
  corrective_actions: string | null
  observed_category: string | null
  observed_subcategory: string | null
  observed_response: string | null
  how_did_it_happen: string | null
  how_was_it_fixed: string | null
  what_should_we_learn: string | null
  how_could_it_be_prevented: string | null
  fixed_problem: boolean | null
  status: string | null
  submitted_at: string
  submission_images: SubmissionImage[]
}

type CompanyFilter = 'all' | 'Caldwell' | 'Preload'

type EmployeeTargetRow = {
  id: string
  company: string
  division: string
  employee_count: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [employeeTargets, setEmployeeTargets] = useState<EmployeeTargetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [leaderFilter, setLeaderFilter] = useState('')
  const [fixedFilter, setFixedFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  )

  const [targetCompany, setTargetCompany] = useState<'Preload' | 'Caldwell'>('Preload')
  const [targetDivision, setTargetDivision] = useState('')
  const [targetEmployeeCount, setTargetEmployeeCount] = useState('')
  const [targetMessage, setTargetMessage] = useState('')

  const [editCounts, setEditCounts] = useState<Record<string, string>>({})

  const [selectedImage, setSelectedImage] = useState<{
    url: string
    name: string
  } | null>(null)

  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionRow | null>(null)

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
          company,
          report_date,
          name,
          division,
          location,
          superintendent,
          supervisor,
          what_happened,
          corrective_actions,
          observed_category,
          observed_subcategory,
          observed_response,
          how_did_it_happen,
          how_was_it_fixed,
          what_should_we_learn,
          how_could_it_be_prevented,
          fixed_problem,
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

      const { data: targets, error: targetsError } = await supabase
        .from('employee_targets')
        .select('id, company, division, employee_count')
        .order('company', { ascending: true })

      if (targetsError) {
        console.error('Targets error:', targetsError)
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

      const safeTargets = (targets || []) as EmployeeTargetRow[]

      setRows(merged as SubmissionRow[])
      setEmployeeTargets(safeTargets)
      setEditCounts(
        Object.fromEntries(
          safeTargets.map((t) => [`${t.company}-${t.division}`, String(t.employee_count)])
        )
      )
      setLoading(false)
    }

    loadRows()
  }, [checkingAuth])

  const getLeaderName = (row: SubmissionRow) =>
    row.company === 'Caldwell'
      ? row.supervisor || ''
      : row.superintendent || ''

  const targetDivisionOptions =
    targetCompany === 'Preload'
      ? ['Field', 'Shop']
      : ['Steel', 'Civil', 'Shop']

  const uniqueLocations = useMemo(() => {
    const values = rows
      .map((r) => r.location?.trim())
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(values)).sort()
  }, [rows])

  const uniqueDivisions = useMemo(() => {
    const values = rows
      .map((r) => r.division?.trim())
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(values)).sort()
  }, [rows])

  const uniqueLeaders = useMemo(() => {
    const values = rows
      .map((r) => getLeaderName(r).trim())
      .filter((v): v is string => Boolean(v))
    return Array.from(new Set(values)).sort()
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const searchText = search.toLowerCase()
      const leaderName = getLeaderName(row).toLowerCase()

      const matchesCompany =
        companyFilter === 'all' || row.company === companyFilter

      const matchesSearch =
        !search ||
        row.name?.toLowerCase().includes(searchText) ||
        row.location?.toLowerCase().includes(searchText) ||
        row.division?.toLowerCase().includes(searchText) ||
        leaderName.includes(searchText) ||
        row.what_happened?.toLowerCase().includes(searchText) ||
        row.observed_response?.toLowerCase().includes(searchText)

      const matchesLocation =
        !locationFilter || row.location === locationFilter

      const matchesDivision =
        !divisionFilter || row.division === divisionFilter

      const matchesLeader =
        !leaderFilter || getLeaderName(row) === leaderFilter

      const matchesFixed =
        fixedFilter === 'all' ||
        (fixedFilter === 'yes' && row.fixed_problem === true) ||
        (fixedFilter === 'no' && row.fixed_problem === false)

      const compareDate = row.report_date || row.submitted_at?.slice(0, 10)
      const rowDate = compareDate ? new Date(compareDate) : null

      const matchesStartDate =
        !startDate || (rowDate && rowDate >= new Date(`${startDate}T00:00:00`))

      const matchesEndDate =
        !endDate || (rowDate && rowDate <= new Date(`${endDate}T23:59:59`))

      return (
        matchesCompany &&
        matchesSearch &&
        matchesLocation &&
        matchesDivision &&
        matchesLeader &&
        matchesFixed &&
        matchesStartDate &&
        matchesEndDate
      )
    })
  }, [
    rows,
    companyFilter,
    search,
    locationFilter,
    divisionFilter,
    leaderFilter,
    fixedFilter,
    startDate,
    endDate
  ])

  const monthlyRows = useMemo(() => {
    return filteredRows.filter((row) => {
      const monthSource =
        (row.report_date || row.submitted_at?.slice(0, 10) || '').slice(0, 7)
      return monthSource === selectedMonth
    })
  }, [filteredRows, selectedMonth])

  const totalReports = filteredRows.length
  const fixedCount = filteredRows.filter((r) => r.fixed_problem === true).length
  const notFixedCount = filteredRows.filter((r) => r.fixed_problem === false).length

  const companyPieData = [
    {
      name: 'Preload',
      value: filteredRows.filter((r) => (r.company || 'Preload') === 'Preload')
        .length
    },
    {
      name: 'Caldwell',
      value: filteredRows.filter((r) => r.company === 'Caldwell').length
    }
  ]

  const reportsByLocation = Object.values(
    filteredRows.reduce((acc, row) => {
      const key = row.location || 'Unknown'
      if (!acc[key]) acc[key] = { name: key, count: 0 }
      acc[key].count += 1
      return acc
    }, {} as Record<string, { name: string; count: number }>)
  )

  const reportsByLeader = Object.values(
    filteredRows.reduce((acc, row) => {
      const key = getLeaderName(row) || 'Unknown'
      if (!acc[key]) acc[key] = { name: key, count: 0 }
      acc[key].count += 1
      return acc
    }, {} as Record<string, { name: string; count: number }>)
  )

  const reportsOverTime = Object.values(
    filteredRows.reduce((acc, row) => {
      const key = row.report_date || row.submitted_at?.slice(0, 10) || 'Unknown'
      if (!acc[key]) acc[key] = { date: key, count: 0 }
      acc[key].count += 1
      return acc
    }, {} as Record<string, { date: string; count: number }>)
  ).sort((a, b) => a.date.localeCompare(b.date))

  const overallEmployeeCount = employeeTargets.reduce(
    (sum, row) => sum + row.employee_count,
    0
  )
  const overallRequired = overallEmployeeCount * 2
  const overallActual = monthlyRows.length
  const overallCompletion =
    overallRequired > 0 ? Math.round((overallActual / overallRequired) * 100) : 0

  const preloadTargets = employeeTargets.filter((t) => t.company === 'Preload')
  const caldwellTargets = employeeTargets.filter((t) => t.company === 'Caldwell')

  const preloadEmployeeCount = preloadTargets.reduce(
    (sum, row) => sum + row.employee_count,
    0
  )
  const caldwellEmployeeCount = caldwellTargets.reduce(
    (sum, row) => sum + row.employee_count,
    0
  )

  const preloadRequired = preloadEmployeeCount * 2
  const caldwellRequired = caldwellEmployeeCount * 2

  const preloadActual = monthlyRows.filter((r) => r.company === 'Preload').length
  const caldwellActual = monthlyRows.filter((r) => r.company === 'Caldwell').length

  const preloadCompletion =
    preloadRequired > 0 ? Math.round((preloadActual / preloadRequired) * 100) : 0

  const caldwellCompletion =
    caldwellRequired > 0
      ? Math.round((caldwellActual / caldwellRequired) * 100)
      : 0

  const divisionCompletion = employeeTargets.map((target) => {
    const actual = monthlyRows.filter(
      (row) => row.company === target.company && row.division === target.division
    ).length

    const required = target.employee_count * 2
    const percent = required > 0 ? Math.round((actual / required) * 100) : 0

    return {
      ...target,
      actual,
      required,
      percent
    }
  })
const visibleEmployeeTargets =
  companyFilter === 'all'
    ? employeeTargets
    : employeeTargets.filter((t) => t.company === companyFilter)

const visibleDivisionCompletion =
  companyFilter === 'all'
    ? divisionCompletion
    : divisionCompletion.filter((t) => t.company === companyFilter)

  const saveEmployeeTarget = async () => {
    setTargetMessage('')

    if (!targetCompany || !targetDivision || targetEmployeeCount === '') {
      setTargetMessage('Please complete company, division, and employee count.')
      return
    }

    const employeeCount = Number(targetEmployeeCount)

    if (Number.isNaN(employeeCount) || employeeCount < 0) {
      setTargetMessage('Please enter a valid employee count.')
      return
    }

    const { data, error } = await supabase
      .from('employee_targets')
      .upsert(
        [
          {
            company: targetCompany,
            division: targetDivision,
            employee_count: employeeCount
          }
        ],
        {
          onConflict: 'company,division'
        }
      )
      .select('id, company, division, employee_count')

    if (error) {
      console.error(error)
      setTargetMessage(`Error: ${error.message}`)
      return
    }

    const saved = data?.[0]

    if (saved) {
      setEmployeeTargets((prev) => {
        const existing = prev.find(
          (item) => item.company === saved.company && item.division === saved.division
        )

        if (existing) {
          return prev.map((item) =>
            item.company === saved.company && item.division === saved.division
              ? saved
              : item
          )
        }

        return [...prev, saved]
      })

      setEditCounts((prev) => ({
        ...prev,
        [`${saved.company}-${saved.division}`]: String(saved.employee_count)
      }))
    }

    setTargetEmployeeCount('')
    setTargetDivision('')
    setTargetMessage('Employee count saved.')
  }

  const updateExistingEmployeeCount = async (
    company: string,
    division: string
  ) => {
    const key = `${company}-${division}`
    const nextValue = Number(editCounts[key] || 0)

    if (Number.isNaN(nextValue) || nextValue < 0) {
      return
    }

    const { data, error } = await supabase
      .from('employee_targets')
      .upsert(
        [
          {
            company,
            division,
            employee_count: nextValue
          }
        ],
        {
          onConflict: 'company,division'
        }
      )
      .select('id, company, division, employee_count')

    if (error) {
      console.error(error)
      return
    }

    const saved = data?.[0]

    if (saved) {
      setEmployeeTargets((prev) =>
        prev.map((item) =>
          item.company === saved.company && item.division === saved.division
            ? saved
            : item
        )
      )
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-400 bg-white p-3 text-black placeholder:text-gray-500 [color:black] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const dashboardBackground =
    companyFilter === 'Caldwell'
      ? 'bg-gradient-to-br from-green-900 via-green-700 to-green-500'
      : companyFilter === 'Preload'
      ? 'bg-gradient-to-br from-red-900 via-red-700 to-red-500'
      : 'bg-gradient-to-br from-red-900 via-red-700 to-green-800'

  if (checkingAuth) {
    return (
      <main className={`min-h-screen p-6 text-white ${dashboardBackground}`}>
        <div className="mx-auto max-w-7xl">
          <p className="text-lg font-medium">Checking login...</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`min-h-screen p-6 text-white ${dashboardBackground}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">SCAN Cards</h1>
            <p className="text-white/90">
              Review reports for Preload and Caldwell.
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

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCompanyFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              companyFilter === 'all'
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white'
            }`}
          >
            Caldwell/Preload
          </button>

          <button
            type="button"
            onClick={() => setCompanyFilter('Caldwell')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              companyFilter === 'Caldwell'
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white'
            }`}
          >
            Caldwell
          </button>

          <button
            type="button"
            onClick={() => setCompanyFilter('Preload')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              companyFilter === 'Preload'
                ? 'bg-white text-gray-900'
                : 'bg-white/20 text-white'
            }`}
          >
            Preload
          </button>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-black">Monthly Completion</h2>
              <p className="text-sm text-gray-600">
                Requirement: 2 reports per month per employee
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Overall Completion</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {overallCompletion}%
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {overallActual} / {overallRequired}
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-4">
              <p className="text-sm text-gray-500">Preload Completion</p>
              <p className="mt-2 text-3xl font-bold text-red-700">
                {preloadCompletion}%
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {preloadActual} / {preloadRequired}
              </p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-sm text-gray-500">Caldwell Completion</p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {caldwellCompletion}%
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {caldwellActual} / {caldwellRequired}
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 text-lg font-semibold text-black">
              Add / Update Weekly Employee Count
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <select
                value={targetCompany}
                onChange={(e) => {
                  const value = e.target.value as 'Preload' | 'Caldwell'
                  setTargetCompany(value)
                  setTargetDivision('')
                }}
                className={inputClass}
              >
                <option value="Preload">Preload</option>
                <option value="Caldwell">Caldwell</option>
              </select>

              <select
                value={targetDivision}
                onChange={(e) => setTargetDivision(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose division</option>
                {targetDivisionOptions.map((division) => (
                  <option key={division} value={division}>
                    {division}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                value={targetEmployeeCount}
                onChange={(e) => setTargetEmployeeCount(e.target.value)}
                className={inputClass}
                placeholder="Employee count"
              />

              <button
                type="button"
                onClick={saveEmployeeTarget}
                className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Save Count
              </button>
            </div>

            {targetMessage && (
              <p className="mt-3 text-sm font-medium text-gray-700">
                {targetMessage}
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-semibold text-black">
                Current Employee Counts
              </h3>
              <div className="space-y-3">
                {visibleEmployeeTargets.length === 0 ? (
                  <p className="text-sm text-gray-600">No employee counts saved yet.</p>
                ) : (
                  employeeTargets.map((target) => {
                    const key = `${target.company}-${target.division}`

                    return (
                      <div
                        key={key}
                        className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-4"
                      >
                        <div className="text-sm text-gray-900">
                          <div className="font-semibold">{target.company}</div>
                          <div className="text-gray-600">{target.division}</div>
                        </div>

                        <div className="flex items-center text-sm text-gray-600">
                          Required: {target.employee_count * 2}
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={editCounts[key] ?? String(target.employee_count)}
                          onChange={(e) =>
                            setEditCounts((prev) => ({
                              ...prev,
                              [key]: e.target.value
                            }))
                          }
                          className={inputClass}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            updateExistingEmployeeCount(
                              target.company,
                              target.division
                            )
                          }
                          className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                        >
                          Update
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold text-black">
                Division Completion
              </h3>
              
              <div className="space-y-3">
                {visibleDivisionCompletion.length === 0 ? (
                  <p className="text-sm text-gray-600">No division targets yet.</p>
                ) : (
                  visibleDivisionCompletion.map((item) => (
                    <div
                      key={`${item.company}-${item.division}`}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.company} / {item.division}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.actual} / {item.required}
                          </p>
                        </div>

                        <p className="text-xl font-bold text-gray-900">
                          {item.percent}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <p className="mt-2 text-3xl font-bold text-red-600">
              {notFixedCount}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Company Split
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={companyPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    label
                  >
                    <Cell fill="#dc2626" />
                    <Cell fill="#16a34a" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Reports Over Time
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#374151" />
                  <YAxis allowDecimals={false} stroke="#374151" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Reports by Superintendent/Supervisor
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportsByLeader}>
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
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Reports by Location
            </h2>
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
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow">
          <h2 className="mb-4 text-xl font-semibold text-black">Filters</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input
              type="text"
              placeholder="Search name, location, division..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">All locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>

            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">All divisions</option>
              {uniqueDivisions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>

            <select
              value={leaderFilter}
              onChange={(e) => setLeaderFilter(e.target.value)}
              className={inputClass}
            >
              <option value="">All Superintendents/Supervisors</option>
              {uniqueLeaders.map((leader) => (
                <option key={leader} value={leader}>
                  {leader}
                </option>
              ))}
            </select>

            <select
              value={fixedFilter}
              onChange={(e) => setFixedFilter(e.target.value)}
              className={inputClass}
            >
              <option value="all">All reports</option>
              <option value="yes">Fixed</option>
              <option value="no">Not fixed</option>
            </select>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
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
                setCompanyFilter('all')
                setSearch('')
                setLocationFilter('')
                setDivisionFilter('')
                setLeaderFilter('')
                setFixedFilter('all')
                setStartDate('')
                setEndDate('')
              }}
              className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-black hover:bg-gray-300"
            >
              Clear filters
            </button>
          </div>
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
              const leaderLabel =
                row.company === 'Caldwell' ? 'Supervisor' : 'Superintendent'
              const leaderValue = getLeaderName(row) || '—'

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
                        <p className="text-sm font-medium text-gray-700">
                          {row.company || 'Preload'} • {row.division || 'No division'}
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
                        <span className="font-medium">{leaderLabel}:</span>{' '}
                        {leaderValue}
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-sm font-medium text-gray-900">
                        {row.company === 'Caldwell'
                          ? 'What was observed?'
                          : 'What happened?'}
                      </p>
                      <p className="line-clamp-3 text-sm text-gray-700">
                        {row.company === 'Caldwell'
                          ? row.observed_response || '—'
                          : row.what_happened || '—'}
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
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedSubmission.name || 'No name'}
                  </h2>
                  <p className="text-lg font-medium text-blue-700">
                    {selectedSubmission.company || 'Preload'} •{' '}
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
                  <p className="text-sm font-medium text-gray-500">Division</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.division || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">
                    {selectedSubmission.company === 'Caldwell'
                      ? 'Supervisor'
                      : 'Superintendent'}
                  </p>
                  <p className="mt-1 text-gray-900">
                    {getLeaderName(selectedSubmission) || '—'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="mt-1 text-gray-900">
                    {selectedSubmission.report_date || '—'}
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

                {selectedSubmission.company === 'Preload' ? (
                  <>
                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        What happened?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.what_happened || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        Corrective actions
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.corrective_actions || '—'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        What was observed?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.observed_category || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        Observed detail
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.observed_subcategory || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">Response</p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.observed_response || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        How did it happen?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.how_did_it_happen || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        How was it fixed?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.how_was_it_fixed || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        What should we learn?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.what_should_we_learn || '—'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
                      <p className="text-sm font-medium text-gray-500">
                        How could it be prevented?
                      </p>
                      <p className="mt-1 text-gray-900">
                        {selectedSubmission.how_could_it_be_prevented || '—'}
                      </p>
                    </div>
                  </>
                )}
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