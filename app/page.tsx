'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [form, setForm] = useState({
    name: '',
    location: '',
    superintendent: '',
    what_happened: '',
    fixed_problem: false,
    corrective_actions: ''
  })

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const cardClass = 'rounded-2xl bg-white p-4 shadow sm:p-6'

  const canSubmit = useMemo(() => {
    return (
      form.name.trim() &&
      form.location.trim() &&
      form.what_happened.trim()
    )
  }, [form])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = 'checked' in e.target ? e.target.checked : false

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile)
      setPreviewUrl(objectUrl)
    } else {
      setPreviewUrl('')
    }
  }

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setForm({
      name: '',
      location: '',
      superintendent: '',
      what_happened: '',
      fixed_problem: false,
      corrective_actions: ''
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
      const { data: surveyRow, error: surveyError } = await supabase
        .from('surveys')
        .select('id')
        .limit(1)
        .single()

      if (surveyError || !surveyRow) {
        throw new Error(surveyError?.message || 'Survey not found')
      }

      const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert([
          {
            survey_id: surveyRow.id,
            name: form.name.trim(),
            location: form.location.trim(),
            superintendent: form.superintendent.trim(),
            what_happened: form.what_happened.trim(),
            fixed_problem: form.fixed_problem,
            corrective_actions: form.corrective_actions.trim(),
            status: 'new'
          }
        ])
        .select()
        .single()

      if (submissionError || !submission) {
        throw new Error(submissionError?.message || 'Failed to save submission')
      }

      if (file) {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const safeExt = fileExt.toLowerCase()
        const filePath = `${submission.id}/photo.${safeExt}`

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
              submission_id: submission.id,
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
    <main className="min-h-screen bg-gray-100 px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 text-center sm:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            SCAN Cards
          </h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Submit a report and upload a photo from your phone.
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
                onClick={resetForm}
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
                  Name (Nombre) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter your name"
                  autoComplete="name"
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
                  value={form.location}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter location"
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
                  value={form.superintendent}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter superintendent name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  What Happened? (Qué pasó?) <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="what_happened"
                  value={form.what_happened}
                  onChange={handleChange}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder="Describe what happened"
                  required
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="fixed_problem"
                    checked={form.fixed_problem}
                    onChange={handleChange}
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
                  value={form.corrective_actions}
                  onChange={handleChange}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder="Describe corrective actions"
                />
              </div>

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

                <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                  You can take a new photo or choose one from your phone.
                </p>

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