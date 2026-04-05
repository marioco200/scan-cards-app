'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CompanyType = '' | 'Preload' | 'Caldwell'
type ObservedCategory =
  | ''
  | 'Care and Wellbeing for Others w/o Blame (Cuidado y Bienestar de otros)'
  | 'Learning & Improving - Suggestion for Improvement (Aprendizaje y Mejorando - Sugerencias para mejorar)'

export default function Home() {
  const [company, setCompany] = useState<CompanyType>('')

  const [preloadForm, setPreloadForm] = useState({
    name: '',
    division: '',
    location: '',
    superintendent: '',
    what_happened: '',
    fixed_problem: false,
    corrective_actions: ''
  })

  const [caldwellForm, setCaldwellForm] = useState({
    report_date: '',
    name: '',
    division: '',
    supervisor: '',
    location: '',
    observed_category: '' as ObservedCategory,
    observed_subcategory: '',
    observed_response: '',
    how_did_it_happen: '',
    fixed_problem: false,
    how_was_it_fixed: '',
    what_should_we_learn: '',
    how_could_it_be_prevented: ''
  })

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const cardClass = 'rounded-2xl bg-white p-4 shadow sm:p-6'

  const pageBackground =
    company === 'Preload'
      ? 'bg-gradient-to-br from-red-800 to-red-600'
      : company === 'Caldwell'
      ? 'bg-gradient-to-br from-green-800 to-green-600'
      : 'bg-gradient-to-r from-red-700 via-red-700 to-green-700'

  const canSubmit = useMemo(() => {
    if (company === 'Preload') {
      return (
        preloadForm.name.trim() &&
        preloadForm.division.trim() &&
        preloadForm.location.trim() &&
        preloadForm.what_happened.trim()
      )
    }

    if (company === 'Caldwell') {
      return (
        caldwellForm.report_date.trim() &&
        caldwellForm.name.trim() &&
        caldwellForm.division.trim() &&
        caldwellForm.supervisor.trim() &&
        caldwellForm.location.trim() &&
        caldwellForm.observed_category.trim() &&
        caldwellForm.observed_response.trim() &&
        caldwellForm.how_did_it_happen.trim() &&
        caldwellForm.what_should_we_learn.trim() &&
        caldwellForm.how_could_it_be_prevented.trim()
      )
    }

    return false
  }, [company, preloadForm, caldwellForm])

  const handlePreloadChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = 'checked' in e.target ? e.target.checked : false

    setPreloadForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCaldwellChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = 'checked' in e.target ? e.target.checked : false

    setCaldwellForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }

      if (name === 'observed_category' && value !== 'Care and Wellbeing for Others w/o Blame (Cuidado y Bienestar de otros)') {
        next.observed_subcategory = ''
      }

      return next
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile))
    } else {
      setPreviewUrl('')
    }
  }

  const resetAll = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setCompany('')
    setPreloadForm({
      name: '',
      division: '',
      location: '',
      superintendent: '',
      what_happened: '',
      fixed_problem: false,
      corrective_actions: ''
    })
    setCaldwellForm({
      report_date: '',
      name: '',
      division: '',
      supervisor: '',
      location: '',
      observed_category: '',
      observed_subcategory: '',
      observed_response: '',
      how_did_it_happen: '',
      fixed_problem: false,
      how_was_it_fixed: '',
      what_should_we_learn: '',
      how_could_it_be_prevented: ''
    })
    setFile(null)
    setPreviewUrl('')
    setMessage('')
    setSubmitted(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (!company) {
        throw new Error('Please choose a company.')
      }

      const { data: surveyRow, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .eq('title', company)
        .limit(1)
        .maybeSingle()

      if (surveyError || !surveyRow) {
        throw new Error('Survey not found for selected company.')
      }

      const submissionId = crypto.randomUUID()

      const commonData = {
        id: submissionId,
        survey_id: surveyRow.id,
        company,
        status: 'new'
      }

      const payload =
        company === 'Preload'
          ? {
              ...commonData,
              report_date: new Date().toISOString().slice(0, 10),
              name: preloadForm.name.trim(),
              division: preloadForm.division.trim(),
              location: preloadForm.location.trim(),
              superintendent: preloadForm.superintendent.trim(),
              what_happened: preloadForm.what_happened.trim(),
              fixed_problem: preloadForm.fixed_problem,
              corrective_actions: preloadForm.corrective_actions.trim()
            }
          : {
              ...commonData,
              report_date: caldwellForm.report_date,
              name: caldwellForm.name.trim(),
              division: caldwellForm.division.trim(),
              supervisor: caldwellForm.supervisor.trim(),
              location: caldwellForm.location.trim(),
              observed_category: caldwellForm.observed_category.trim(),
              observed_subcategory: caldwellForm.observed_subcategory.trim(),
              observed_response: caldwellForm.observed_response.trim(),
              how_did_it_happen: caldwellForm.how_did_it_happen.trim(),
              fixed_problem: caldwellForm.fixed_problem,
              how_was_it_fixed: caldwellForm.how_was_it_fixed.trim(),
              what_should_we_learn: caldwellForm.what_should_we_learn.trim(),
              how_could_it_be_prevented: caldwellForm.how_could_it_be_prevented.trim()
            }

      const { error: submissionError } = await supabase
        .from('submissions')
        .insert([payload])

      if (submissionError) {
        throw new Error(submissionError.message || 'Failed to save submission')
      }

      if (file) {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const safeExt = fileExt.toLowerCase()
        const filePath = `${submissionId}/photo.${safeExt}`

        const { error: uploadError } = await supabase.storage
          .from('incident-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        const { data: publicUrlData } = supabase.storage
          .from('incident-photos')
          .getPublicUrl(filePath)

        const { error: imageInsertError } = await supabase
          .from('submission_images')
          .insert([
            {
              submission_id: submissionId,
              file_name: file.name,
              file_path: filePath,
              file_url: publicUrlData.publicUrl,
              mime_type: file.type,
              file_size_bytes: file.size
            }
          ])

        if (imageInsertError) {
          throw new Error(imageInsertError.message)
        }
      }

      setSubmitted(true)
      setMessage('Report submitted successfully.')
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Something went wrong'
      console.error(error)
      setMessage(`Error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`min-h-screen px-3 py-4 sm:px-6 sm:py-6 ${pageBackground}`}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            SCAN Cards
          </h1>
          <p className="mt-2 text-sm text-white/90 sm:text-base">
            Choose a company and submit a report.
          </p>
        </div>

        {submitted ? (
          <div className={cardClass}>
            <div className="rounded-2xl bg-green-50 p-5 text-center">
              <h2 className="text-2xl font-bold text-green-700">
                Report Submitted
              </h2>
              <p className="mt-2 text-sm text-green-700 sm:text-base">
                Your report was saved successfully.
              </p>

              <button
                type="button"
                onClick={resetAll}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700"
              >
                Submit Another Report
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={cardClass}>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Company
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value as CompanyType)}
                  className={inputClass}
                  required
                >
                  <option value="">Choose a company</option>
                  <option value="Preload">Preload</option>
                  <option value="Caldwell">Caldwell</option>
                </select>
              </div>

              {company === 'Preload' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Name (Nombre) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={preloadForm.name}
                      onChange={handlePreloadChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Division (División) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="division"
                      value={preloadForm.division}
                      onChange={handlePreloadChange}
                      className={inputClass}
                      required
                    >
                      <option value="">Choose division</option>
                      <option value="Field">Field (Campo)</option>
                      <option value="Shop">Shop (Taller)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Location (Ubicación) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={preloadForm.location}
                      onChange={handlePreloadChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Superintendent (Superintendente)
                    </label>
                    <input
                      type="text"
                      name="superintendent"
                      value={preloadForm.superintendent}
                      onChange={handlePreloadChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      What Happened? (Qué pasó?) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="what_happened"
                      value={preloadForm.what_happened}
                      onChange={handlePreloadChange}
                      className={`${inputClass} min-h-[120px]`}
                      required
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="fixed_problem"
                        checked={preloadForm.fixed_problem}
                        onChange={handlePreloadChange}
                        className="h-5 w-5 rounded border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-800 sm:text-base">
                        Fixed the problem? (Arregló el problema)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Corrective Actions (Qué hizo para corregir el problema?)
                    </label>
                    <textarea
                      name="corrective_actions"
                      value={preloadForm.corrective_actions}
                      onChange={handlePreloadChange}
                      className={`${inputClass} min-h-[120px]`}
                    />
                  </div>
                </>
              )}

              {company === 'Caldwell' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Date (Fecha) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="report_date"
                      value={caldwellForm.report_date}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Name (Nombre) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={caldwellForm.name}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Division (División) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="division"
                      value={caldwellForm.division}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    >
                      <option value="">Choose division</option>
                      <option value="Steel">Steel</option>
                      <option value="Civil">Civil</option>
                      <option value="Shop">Shop</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Supervisor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="supervisor"
                      value={caldwellForm.supervisor}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Location (Ubicación) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={caldwellForm.location}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      What was observed? (Qué se observó?) <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="observed_category"
                      value={caldwellForm.observed_category}
                      onChange={handleCaldwellChange}
                      className={inputClass}
                      required
                    >
                      <option value="">Choose an option</option>
                      <option value="Care and Wellbeing for Others w/o Blame (Cuidado y Bienestar de otros)">
                        Care and Wellbeing for Others w/o Blame (Cuidado y Bienestar de otros)
                      </option>
                      <option value="Learning & Improving - Suggestion for Improvement (Aprendizaje y Mejorando - Sugerencias para mejorar)">
                        Learning & Improving - Suggestion for Improvement (Aprendizaje y Mejorando - Sugerencias para mejorar)
                      </option>
                    </select>
                  </div>

                  {caldwellForm.observed_category === 'Care and Wellbeing for Others w/o Blame (Cuidado y Bienestar de otros)' && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-800">
                        Care and Wellbeing detail
                      </label>
                      <select
                        name="observed_subcategory"
                        value={caldwellForm.observed_subcategory}
                        onChange={handleCaldwellChange}
                        className={inputClass}
                      >
                        <option value="">Choose a detail</option>
                        <option value="A condition that could hurt">
                          A condition that could hurt
                        </option>
                        <option value="Someone at risk of harm">
                          Someone at risk of harm
                        </option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      Response / Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="observed_response"
                      value={caldwellForm.observed_response}
                      onChange={handleCaldwellChange}
                      className={`${inputClass} min-h-[120px]`}
                      placeholder="Write your response here"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      How did it happen? (Cómo fue que pasó?) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="how_did_it_happen"
                      value={caldwellForm.how_did_it_happen}
                      onChange={handleCaldwellChange}
                      className={`${inputClass} min-h-[120px]`}
                      required
                    />
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="fixed_problem"
                        checked={caldwellForm.fixed_problem}
                        onChange={handleCaldwellChange}
                        className="h-5 w-5 rounded border-gray-300"
                      />
                      <span className="text-sm font-semibold text-gray-800 sm:text-base">
                        Fixed the problem? (Arregló el problema?)
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      How was it fixed? (Cómo se arregló?)
                    </label>
                    <textarea
                      name="how_was_it_fixed"
                      value={caldwellForm.how_was_it_fixed}
                      onChange={handleCaldwellChange}
                      className={`${inputClass} min-h-[120px]`}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      What should we learn? (Qué deberíamos de aprender?) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="what_should_we_learn"
                      value={caldwellForm.what_should_we_learn}
                      onChange={handleCaldwellChange}
                      className={`${inputClass} min-h-[120px]`}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      How could it be prevented? (Cómo podría haber sido prevenido?) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="how_could_it_be_prevented"
                      value={caldwellForm.how_could_it_be_prevented}
                      onChange={handleCaldwellChange}
                      className={`${inputClass} min-h-[120px]`}
                      required
                    />
                  </div>
                </>
              )}

              {company && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Submit Photo (Subir foto)
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className={`${inputClass} file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700`}
                  />

                  {previewUrl && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-gray-800">
                        Photo Preview
                      </p>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full rounded-2xl border border-gray-200 object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div
                  className={`rounded-xl p-3 text-sm font-medium ${
                    message.startsWith('Error:')
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}