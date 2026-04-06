'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type CompanyType = 'Preload' | 'Caldwell'
type TabType = 'create' | 'submitted' | 'issues' | 'templates'

type TemplateRow = {
  id: string
  company: CompanyType
  name: string
  leader_name?: string | null
  created_at: string
}

type TemplateQuestionRow = {
  id: string
  template_id: string
  question_text: string
  sort_order: number
}

type SubmissionRow = {
  id: string
  template_id: string
  template_name: string
  company: CompanyType
  leader_name: string | null
  submitted_at: string
}

type AnswerRow = {
  id: string
  submission_id: string
  template_question_id: string | null
  question_text: string
  status: 'safe' | 'issue' | 'fixed' | 'na'
  note: string | null
  photo_path: string | null
  photo_url: string | null
  created_at: string
}

type FillAnswer = {
  template_question_id: string
  question_text: string
  status: 'safe' | 'issue' | 'fixed' | 'na' | ''
  note: string
  file: File | null
}

type BuilderQuestion = {
  id: string
  question_text: string
}

type EditableSubmissionAnswer = {
  id: string
  question_text: string
  status: 'safe' | 'issue' | 'fixed' | 'na'
  note: string
  photo_url: string | null
  photo_path: string | null
}

export default function InspectionsPage() {
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<TabType>('create')
  const [company, setCompany] = useState<CompanyType>('Preload')
  const [leaderFilter, setLeaderFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [questions, setQuestions] = useState<TemplateQuestionRow[]>([])
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [answers, setAnswers] = useState<AnswerRow[]>([])

  const [message, setMessage] = useState('')

  const [templateName, setTemplateName] = useState('')
  const [templateLeaderName, setTemplateLeaderName] = useState('')
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>([
    { id: crypto.randomUUID(), question_text: '' }
  ])
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const [activeTemplate, setActiveTemplate] = useState<TemplateRow | null>(null)
  const [leaderName, setLeaderName] = useState('')
  const [fillAnswers, setFillAnswers] = useState<FillAnswer[]>([])

  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRow | null>(null)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [isEditingSubmission, setIsEditingSubmission] = useState(false)
  const [editSubmissionLeaderName, setEditSubmissionLeaderName] = useState('')
  const [editSubmissionAnswers, setEditSubmissionAnswers] = useState<EditableSubmissionAnswer[]>([])

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white p-3 text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

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

  const loadAll = async () => {
    setLoading(true)

    const [{ data: tData }, { data: qData }, { data: sData }, { data: aData }] =
      await Promise.all([
        supabase
          .from('inspection_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('inspection_template_questions')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('inspection_submissions')
          .select('*')
          .order('submitted_at', { ascending: false }),
        supabase
          .from('inspection_answers')
          .select('*')
          .order('created_at', { ascending: false })
      ])

    setTemplates((tData || []) as TemplateRow[])
    setQuestions((qData || []) as TemplateQuestionRow[])
    setSubmissions((sData || []) as SubmissionRow[])
    setAnswers((aData || []) as AnswerRow[])

    setLoading(false)
  }

  useEffect(() => {
    if (checkingAuth) return
    loadAll()
  }, [checkingAuth])

  const resetTemplateBuilder = () => {
    setEditingTemplateId(null)
    setTemplateName('')
    setTemplateLeaderName('')
    setBuilderQuestions([{ id: crypto.randomUUID(), question_text: '' }])
  }

  const companyTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCompany = t.company === company
      const matchesLeader = !leaderFilter || t.leader_name === leaderFilter
      return matchesCompany && matchesLeader
    })
  }, [templates, company, leaderFilter])

  const leaderOptions = useMemo(() => {
    const submissionValues = submissions
      .filter((s) => s.company === company)
      .map((s) => s.leader_name?.trim())
      .filter((v): v is string => Boolean(v))

    const templateValues = templates
      .filter((t) => t.company === company)
      .map((t) => t.leader_name?.trim())
      .filter((v): v is string => Boolean(v))

    return Array.from(new Set([...submissionValues, ...templateValues])).sort()
  }, [submissions, templates, company])

  const filteredSubmitted = useMemo(() => {
    return submissions.filter((s) => {
      const matchesCompany = s.company === company
      const matchesLeader = !leaderFilter || s.leader_name === leaderFilter
      const matchesDate =
        !dateFilter ||
        new Date(s.submitted_at).toISOString().slice(0, 10) === dateFilter

      return matchesCompany && matchesLeader && matchesDate
    })
  }, [submissions, company, leaderFilter, dateFilter])

  const filteredIssues = useMemo(() => {
    const submissionMap = Object.fromEntries(submissions.map((s) => [s.id, s]))

    return answers.filter((a) => {
      const submission = submissionMap[a.submission_id]
      if (!submission) return false

      const matchesCompany = submission.company === company
      const matchesLeader = !leaderFilter || submission.leader_name === leaderFilter
      const matchesStatus = a.status === 'issue' || a.status === 'fixed'
      const matchesDate =
        !dateFilter ||
        new Date(submission.submitted_at).toISOString().slice(0, 10) === dateFilter

      return matchesCompany && matchesLeader && matchesStatus && matchesDate
    })
  }, [answers, submissions, company, leaderFilter, dateFilter])

  const inspectionsDoneCount = submissions.filter((s) => s.company === company).length

  const issuesCount = answers.filter((a) => {
    const sub = submissions.find((s) => s.id === a.submission_id)
    return sub?.company === company && a.status === 'issue'
  }).length

  const fixedCount = answers.filter((a) => {
    const sub = submissions.find((s) => s.id === a.submission_id)
    return sub?.company === company && a.status === 'fixed'
  }).length

  const openTemplate = (template: TemplateRow) => {
    setActiveTemplate(template)
    setLeaderName(template.leader_name || '')

    const templateQuestions = questions
      .filter((q) => q.template_id === template.id)
      .sort((a, b) => a.sort_order - b.sort_order)

    setFillAnswers(
      templateQuestions.map((q) => ({
        template_question_id: q.id,
        question_text: q.question_text,
        status: '',
        note: '',
        file: null
      }))
    )

    setTab('templates')
  }

  const editTemplate = (template: TemplateRow) => {
    setEditingTemplateId(template.id)
    setCompany(template.company)
    setTemplateName(template.name)
    setTemplateLeaderName(template.leader_name || '')

    const templateQuestions = questions
      .filter((q) => q.template_id === template.id)
      .sort((a, b) => a.sort_order - b.sort_order)

    setBuilderQuestions(
      templateQuestions.length > 0
        ? templateQuestions.map((q) => ({
            id: q.id,
            question_text: q.question_text
          }))
        : [{ id: crypto.randomUUID(), question_text: '' }]
    )

    setMessage(`Editing template: ${template.name}`)
    setTab('create')
  }

  const openSubmittedInspection = (submission: SubmissionRow) => {
    setSelectedSubmission(submission)
    setIsEditingSubmission(false)
    setEditSubmissionLeaderName(submission.leader_name || '')

    const submissionAnswers = answers
      .filter((a) => a.submission_id === submission.id)
      .map((a) => ({
        id: a.id,
        question_text: a.question_text,
        status: a.status,
        note: a.note || '',
        photo_url: a.photo_url,
        photo_path: a.photo_path
      }))

    setEditSubmissionAnswers(submissionAnswers)
  }

  const addQuestion = () => {
    setBuilderQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question_text: '' }
    ])
  }

  const removeQuestion = (id: string) => {
    setBuilderQuestions((prev) => {
      if (prev.length === 1) {
        return [{ id: crypto.randomUUID(), question_text: '' }]
      }
      return prev.filter((q) => q.id !== id)
    })
  }

  const updateQuestion = (id: string, value: string) => {
    setBuilderQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question_text: value } : q))
    )
  }

  const saveTemplate = async () => {
    setMessage('')

    if (!templateName.trim()) {
      setMessage('Template name is required.')
      return
    }

    const cleanQuestions = builderQuestions
      .map((q) => q.question_text.trim())
      .filter(Boolean)

    if (cleanQuestions.length === 0) {
      setMessage('Please add at least one question.')
      return
    }

    if (editingTemplateId) {
      const { error: templateUpdateError } = await supabase
        .from('inspection_templates')
        .update({
          company,
          name: templateName.trim(),
          leader_name: templateLeaderName.trim()
        })
        .eq('id', editingTemplateId)

      if (templateUpdateError) {
        setMessage(`Error: ${templateUpdateError.message}`)
        return
      }

      const { error: deleteQuestionsError } = await supabase
        .from('inspection_template_questions')
        .delete()
        .eq('template_id', editingTemplateId)

      if (deleteQuestionsError) {
        setMessage(`Error: ${deleteQuestionsError.message}`)
        return
      }

      const questionRows = cleanQuestions.map((questionText, index) => ({
        template_id: editingTemplateId,
        question_text: questionText,
        sort_order: index + 1
      }))

      const { error: insertQuestionsError } = await supabase
        .from('inspection_template_questions')
        .insert(questionRows)

      if (insertQuestionsError) {
        setMessage(`Error: ${insertQuestionsError.message}`)
        return
      }

      resetTemplateBuilder()
      setMessage('Inspection template updated.')
      await loadAll()
      setTab('templates')
      return
    }

    const { data: template, error: templateError } = await supabase
      .from('inspection_templates')
      .insert([
        {
          company,
          name: templateName.trim(),
          leader_name: templateLeaderName.trim()
        }
      ])
      .select()
      .single()

    if (templateError || !template) {
      setMessage(`Error: ${templateError?.message || 'Failed to create template'}`)
      return
    }

    const questionRows = cleanQuestions.map((questionText, index) => ({
      template_id: template.id,
      question_text: questionText,
      sort_order: index + 1
    }))

    const { error: questionError } = await supabase
      .from('inspection_template_questions')
      .insert(questionRows)

    if (questionError) {
      setMessage(`Error: ${questionError.message}`)
      return
    }

    resetTemplateBuilder()
    setMessage('Inspection template created.')
    await loadAll()
    setTab('templates')
  }

  const deleteTemplate = async (templateId: string) => {
    const submissionCount = submissions.filter((s) => s.template_id === templateId).length

    if (submissionCount > 0) {
      setMessage(
        'This template already has submitted inspections and cannot be deleted safely.'
      )
      return
    }

    const confirmed = window.confirm('Delete this template?')
    if (!confirmed) return

    const { error: questionDeleteError } = await supabase
      .from('inspection_template_questions')
      .delete()
      .eq('template_id', templateId)

    if (questionDeleteError) {
      setMessage(`Error: ${questionDeleteError.message}`)
      return
    }

    const { error: templateDeleteError } = await supabase
      .from('inspection_templates')
      .delete()
      .eq('id', templateId)

    if (templateDeleteError) {
      setMessage(`Error: ${templateDeleteError.message}`)
      return
    }

    if (editingTemplateId === templateId) {
      resetTemplateBuilder()
    }

    setMessage('Template deleted.')
    await loadAll()
  }

  const updateFillAnswer = (index: number, updates: Partial<FillAnswer>) => {
    setFillAnswers((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  const submitInspection = async () => {
    setMessage('')

    if (!activeTemplate) {
      setMessage('Please choose a template.')
      return
    }

    const hasIncomplete = fillAnswers.some((a) => !a.status)
    if (hasIncomplete) {
      setMessage('Please select Safe, Issue, Fixed, or N/A for every question.')
      return
    }

    const { data: submission, error: submissionError } = await supabase
      .from('inspection_submissions')
      .insert([
        {
          template_id: activeTemplate.id,
          template_name: activeTemplate.name,
          company: activeTemplate.company,
          leader_name: leaderName.trim()
        }
      ])
      .select()
      .single()

    if (submissionError || !submission) {
      setMessage(`Error: ${submissionError?.message || 'Failed to submit inspection'}`)
      return
    }

    const answerRows: Omit<AnswerRow, 'id' | 'created_at'>[] = []

    for (let i = 0; i < fillAnswers.length; i += 1) {
      const item = fillAnswers[i]
      let photoPath: string | null = null
      let photoUrl: string | null = null

      if (item.file) {
        const fileExt = item.file.name.split('.').pop() || 'jpg'
        const filePath = `${submission.id}/${item.template_question_id}.${fileExt.toLowerCase()}`

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(filePath, item.file, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          setMessage(`Error: ${uploadError.message}`)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(filePath)

        photoPath = filePath
        photoUrl = publicUrlData.publicUrl
      }

      answerRows.push({
        submission_id: submission.id,
        template_question_id: item.template_question_id,
        question_text: item.question_text,
        status: item.status as 'safe' | 'issue' | 'fixed' | 'na',
        note: item.note.trim(),
        photo_path: photoPath,
        photo_url: photoUrl
      })
    }

    const { error: answerError } = await supabase
      .from('inspection_answers')
      .insert(answerRows)

    if (answerError) {
      setMessage(`Error: ${answerError.message}`)
      return
    }

    setMessage('Inspection submitted.')
    setActiveTemplate(null)
    setLeaderName('')
    setFillAnswers([])
    await loadAll()
    setTab('submitted')
  }

  const deleteSubmission = async (submissionId: string) => {
    const confirmed = window.confirm('Delete this submitted inspection?')
    if (!confirmed) return

    const submissionAnswers = answers.filter((a) => a.submission_id === submissionId)

    for (const answer of submissionAnswers) {
      if (answer.photo_path) {
        await supabase.storage.from('inspection-photos').remove([answer.photo_path])
      }
    }

    const { error: answerDeleteError } = await supabase
      .from('inspection_answers')
      .delete()
      .eq('submission_id', submissionId)

    if (answerDeleteError) {
      setMessage(`Error: ${answerDeleteError.message}`)
      return
    }

    const { error: submissionDeleteError } = await supabase
      .from('inspection_submissions')
      .delete()
      .eq('id', submissionId)

    if (submissionDeleteError) {
      setMessage(`Error: ${submissionDeleteError.message}`)
      return
    }

    if (selectedSubmission?.id === submissionId) {
      setSelectedSubmission(null)
      setIsEditingSubmission(false)
    }

    setMessage('Submitted inspection deleted.')
    await loadAll()
  }

  const updateEditSubmissionAnswer = (
    answerId: string,
    updates: Partial<EditableSubmissionAnswer>
  ) => {
    setEditSubmissionAnswers((prev) =>
      prev.map((a) => (a.id === answerId ? { ...a, ...updates } : a))
    )
  }

  const saveEditedSubmission = async () => {
    if (!selectedSubmission) return

    setMessage('')

    const { error: submissionError } = await supabase
      .from('inspection_submissions')
      .update({
        leader_name: editSubmissionLeaderName.trim()
      })
      .eq('id', selectedSubmission.id)

    if (submissionError) {
      setMessage(`Error: ${submissionError.message}`)
      return
    }

    for (const answer of editSubmissionAnswers) {
      const { error: answerError } = await supabase
        .from('inspection_answers')
        .update({
          status: answer.status,
          note: answer.note.trim()
        })
        .eq('id', answer.id)

      if (answerError) {
        setMessage(`Error: ${answerError.message}`)
        return
      }
    }

    setSelectedSubmission((prev) =>
      prev
        ? {
            ...prev,
            leader_name: editSubmissionLeaderName.trim() || null
          }
        : null
    )

    setIsEditingSubmission(false)
    setMessage('Submitted inspection updated.')
    await loadAll()
  }

  const markIssueFixed = async (answerId: string) => {
    const { error } = await supabase
      .from('inspection_answers')
      .update({ status: 'fixed' })
      .eq('id', answerId)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    await loadAll()
  }

  const getSubmissionById = (submissionId: string) =>
    submissions.find((s) => s.id === submissionId)

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
            <h1 className="text-3xl font-bold text-white">Inspections</h1>
            <p className="mt-2 text-white/90">
              Inspection dashboard, templates, issues, and submitted inspections.
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
              onClick={() => router.push('/contacts')}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow hover:bg-gray-100"
            >
              Contact List
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
              setLeaderFilter('')
              setDateFilter('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              company === 'Preload' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Preload
          </button>

          <button
            type="button"
            onClick={() => {
              setCompany('Caldwell')
              setLeaderFilter('')
              setDateFilter('')
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              company === 'Caldwell' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Caldwell
          </button>
        </div>

        {issuesCount > 0 && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800 shadow">
            Notification: {issuesCount} open issue{issuesCount === 1 ? '' : 's'} submitted
            for {company}.
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">Inspections Done</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{inspectionsDoneCount}</p>
          </div>

          <div className="rounded-2xl bg-red-50 p-5 shadow">
            <p className="text-sm text-gray-500">Issues Count</p>
            <p className="mt-2 text-3xl font-bold text-red-700">{issuesCount}</p>
          </div>

          <div className="rounded-2xl bg-green-50 p-5 shadow">
            <p className="text-sm text-gray-500">Fixed Count</p>
            <p className="mt-2 text-3xl font-bold text-green-700">{fixedCount}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-4 shadow">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Superintendent / Foreman
              </label>
              <select
                value={leaderFilter}
                onChange={(e) => setLeaderFilter(e.target.value)}
                className={inputClass}
              >
                <option value="">All Superintendent/Foreman</option>
                {leaderOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Submitted Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'create' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Create Inspection
          </button>

          <button
            type="button"
            onClick={() => setTab('submitted')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'submitted' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Submitted Inspections
          </button>

          <button
            type="button"
            onClick={() => setTab('issues')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'issues' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Issues
          </button>

          <button
            type="button"
            onClick={() => setTab('templates')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'templates' ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            Inspection Templates
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl bg-white p-4 text-sm font-medium text-gray-800 shadow">
            {message}
          </div>
        )}

        {tab === 'create' && (
          <div className="rounded-2xl bg-white p-4 shadow">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-black">
                {editingTemplateId ? 'Edit Inspection Template' : 'Create Inspection Template'}
              </h2>

              {editingTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    resetTemplateBuilder()
                    setMessage('Template edit canceled.')
                  }}
                  className="rounded-lg bg-gray-300 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-400"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-black">Company</label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value as CompanyType)}
                  className={inputClass}
                >
                  <option value="Preload">Preload</option>
                  <option value="Caldwell">Caldwell</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className={inputClass}
                  placeholder="Example: Weekly Scaffold Inspection"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-black">
                  Superintendent / Foreman
                </label>
                <input
                  type="text"
                  value={templateLeaderName}
                  onChange={(e) => setTemplateLeaderName(e.target.value)}
                  className={inputClass}
                  placeholder="Enter Superintendent / Foreman"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {builderQuestions.map((question, index) => (
                <div key={question.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-black">
                      Question {index + 1}
                    </label>

                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      className="rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(question.id, e.target.value)}
                    className={inputClass}
                    placeholder="Enter inspection question"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      Safe
                    </span>
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      Issue
                    </span>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Fixed
                    </span>
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                      N/A
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    Notes and photo upload will be available when filling the inspection.
                  </p>
                </div>
              ))}

              <button
                type="button"
                onClick={addQuestion}
                className="rounded-full bg-blue-600 px-4 py-2 text-lg font-bold text-white hover:bg-blue-700"
              >
                +
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={saveTemplate}
                className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              >
                {editingTemplateId ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        )}

        {tab === 'templates' && (
          <div className="space-y-6">
            {activeTemplate && (
              <div className="rounded-2xl bg-white p-4 shadow">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-black">
                      Fill Inspection: {activeTemplate.name}
                    </h2>
                    <p className="text-sm text-gray-600">Company: {activeTemplate.company}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTemplate(null)
                      setFillAnswers([])
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-black">
                    Superintendent / Foreman
                  </label>
                  <input
                    type="text"
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    className={inputClass}
                    placeholder="Enter Superintendent / Foreman"
                  />
                </div>

                <div className="space-y-4">
                  {fillAnswers.map((item, index) => (
                    <div
                      key={item.template_question_id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <p className="mb-3 font-semibold text-black">
                        {index + 1}. {item.question_text}
                      </p>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {[
                          { label: 'Safe', value: 'safe' },
                          { label: 'Issue', value: 'issue' },
                          { label: 'Fixed', value: 'fixed' },
                          { label: 'N/A', value: 'na' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateFillAnswer(index, {
                                status: option.value as FillAnswer['status']
                              })
                            }
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              item.status === option.value
                                ? option.value === 'issue'
                                  ? 'bg-red-600 text-white'
                                  : option.value === 'fixed'
                                    ? 'bg-green-600 text-white'
                                    : option.value === 'safe'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-black">
                            Note
                          </label>
                          <textarea
                            value={item.note}
                            onChange={(e) => updateFillAnswer(index, { note: e.target.value })}
                            className={`${inputClass} min-h-[110px]`}
                            placeholder="Add note"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-black">
                            Photo
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              updateFillAnswer(index, {
                                file: e.target.files?.[0] || null
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={submitInspection}
                    className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Submit Form
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white p-4 shadow">
              <h2 className="mb-4 text-xl font-semibold text-black">Inspection Templates</h2>

              {companyTemplates.length === 0 ? (
                <p className="text-gray-600">No templates yet.</p>
              ) : (
                <div className="space-y-3">
                  {companyTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-black">{template.name}</p>
                        <p className="text-sm text-gray-600">
                          {questions.filter((q) => q.template_id === template.id).length}{' '}
                          questions
                        </p>
                        <p className="text-sm text-gray-600">
                          Superintendent/Foreman: {template.leader_name || '—'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openTemplate(template)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => editTemplate(template)}
                          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteTemplate(template.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'submitted' && (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-black">Submitted Inspections</h2>

            {filteredSubmitted.length === 0 ? (
              <p className="text-gray-600">No submitted inspections.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Template</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Superintendent/Foreman</th>
                      <th className="px-3 py-2">Submitted At</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmitted.map((submission) => (
                      <tr
                        key={submission.id}
                        className="cursor-pointer border-b hover:bg-gray-50"
                        onClick={() => openSubmittedInspection(submission)}
                      >
                        <td className="px-3 py-2 font-semibold">{submission.template_name}</td>
                        <td className="px-3 py-2">{submission.company}</td>
                        <td className="px-3 py-2">{submission.leader_name || '—'}</td>
                        <td className="px-3 py-2">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSubmission(submission.id)
                            }}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'issues' && (
          <div className="rounded-2xl bg-white p-4 shadow">
            <h2 className="mb-4 text-xl font-semibold text-black">Issues</h2>

            {filteredIssues.length === 0 ? (
              <p className="text-gray-600">No issues found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700">
                  <thead className="bg-gray-100 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Template</th>
                      <th className="px-3 py-2">Question</th>
                      <th className="px-3 py-2">Superintendent/Foreman</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">Photo</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => {
                      const submission = getSubmissionById(issue.submission_id)

                      return (
                        <tr
                          key={issue.id}
                          className={`border-b ${
                            issue.status === 'issue' ? 'bg-red-50' : 'bg-green-50'
                          }`}
                        >
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                issue.status === 'issue'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-green-600 text-white'
                              }`}
                            >
                              {issue.status === 'issue' ? 'Issue' : 'Fixed'}
                            </span>
                          </td>

                          <td className="px-3 py-2 font-semibold">
                            {submission?.template_name || '—'}
                          </td>

                          <td className="px-3 py-2">{issue.question_text}</td>
                          <td className="px-3 py-2">{submission?.leader_name || '—'}</td>
                          <td className="px-3 py-2">{issue.note || '—'}</td>

                          <td className="px-3 py-2">
                            {issue.photo_url ? (
                              <button
                                type="button"
                                onClick={() => setSelectedImageUrl(issue.photo_url!)}
                                className="block"
                              >
                                <img
                                  src={issue.photo_url}
                                  alt="Issue preview"
                                  className="h-12 w-12 rounded object-cover hover:opacity-90"
                                />
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="px-3 py-2">
                            {issue.status === 'issue' ? (
                              <button
                                type="button"
                                onClick={() => markIssueFixed(issue.id)}
                                className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700"
                              >
                                Convert to Fixed
                              </button>
                            ) : (
                              <span className="font-semibold text-green-700">Fixed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedImageUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative max-h-[90vh] max-w-5xl">
              <button
                type="button"
                onClick={() => setSelectedImageUrl(null)}
                className="absolute right-2 top-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-black shadow hover:bg-gray-200"
              >
                Close
              </button>

              <img
                src={selectedImageUrl}
                alt="Expanded preview"
                className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

        {selectedSubmission && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Submitted Inspection Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Template: {selectedSubmission.template_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    Company: {selectedSubmission.company}
                  </p>

                  {isEditingSubmission ? (
                    <div className="mt-2">
                      <label className="mb-1 block text-sm font-medium text-black">
                        Superintendent / Foreman
                      </label>
                      <input
                        type="text"
                        value={editSubmissionLeaderName}
                        onChange={(e) => setEditSubmissionLeaderName(e.target.value)}
                        className={inputClass}
                        placeholder="Enter Superintendent / Foreman"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Superintendent/Foreman: {selectedSubmission.leader_name || '—'}
                    </p>
                  )}

                  <p className="text-sm text-gray-600">
                    Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSubmission((prev) => !prev)}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    {isEditingSubmission ? 'Cancel Edit' : 'Edit'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubmission(null)
                      setIsEditingSubmission(false)
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {editSubmissionAnswers.map((answer, index) => (
                  <div key={answer.id} className="rounded-xl border border-gray-200 p-4">
                    <p className="mb-2 font-semibold text-black">
                      {index + 1}. {answer.question_text}
                    </p>

                    {isEditingSubmission ? (
                      <>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {[
                            { label: 'Safe', value: 'safe' },
                            { label: 'Issue', value: 'issue' },
                            { label: 'Fixed', value: 'fixed' },
                            { label: 'N/A', value: 'na' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateEditSubmissionAnswer(answer.id, {
                                  status: option.value as EditableSubmissionAnswer['status']
                                })
                              }
                              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                                answer.status === option.value
                                  ? option.value === 'issue'
                                    ? 'bg-red-600 text-white'
                                    : option.value === 'fixed'
                                      ? 'bg-green-600 text-white'
                                      : option.value === 'safe'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-white'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={answer.note}
                          onChange={(e) =>
                            updateEditSubmissionAnswer(answer.id, {
                              note: e.target.value
                            })
                          }
                          className={`${inputClass} min-h-[110px]`}
                          placeholder="Add note"
                        />
                      </>
                    ) : (
                      <>
                        <div className="mb-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              answer.status === 'issue'
                                ? 'bg-red-600 text-white'
                                : answer.status === 'fixed'
                                  ? 'bg-green-600 text-white'
                                  : answer.status === 'safe'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-600 text-white'
                            }`}
                          >
                            {answer.status.toUpperCase()}
                          </span>
                        </div>

                        <p className="mb-3 text-sm text-gray-700">
                          <span className="font-semibold">Note:</span> {answer.note || '—'}
                        </p>
                      </>
                    )}

                    {answer.photo_url && (
                      <button
                        type="button"
                        onClick={() => setSelectedImageUrl(answer.photo_url)}
                        className="mt-3 block"
                      >
                        <img
                          src={answer.photo_url}
                          alt="Inspection answer"
                          className="h-28 w-28 rounded-lg object-cover hover:opacity-90"
                        />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {isEditingSubmission && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={saveEditedSubmission}
                    className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl bg-white p-4 text-sm font-medium text-gray-800 shadow">
            Loading inspections...
          </div>
        )}
      </div>
    </main>
  )
}