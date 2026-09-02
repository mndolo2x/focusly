'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  monthly_usage_count: number
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)

  const usageLimit = 5

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    if (!storedUser) {
      router.push('/')
      return
    }
    setUser(JSON.parse(storedUser))
    fetchDocuments()
  }, [router])

  const fetchDocuments = async () => {
    try {
      const storedUser = localStorage.getItem('user')
      if (!storedUser) return

      const userData = JSON.parse(storedUser)
      const response = await fetch(`/api/documents?userId=${userData.id}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        setFile(null)
        return
      }

      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 10MB')
        setFile(null)
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    // Check usage limit
    if (user.monthly_usage_count >= usageLimit) {
      setError(`You have reached your monthly limit of ${usageLimit} documents. Please upgrade your plan.`)
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('Uploading file...')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)

      setUploadProgress(20)
      setUploadStatus('Extracting text from PDF...')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadProgress(60)
      setUploadStatus('Generating summary with AI...')

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/documents/${data.documentId}/status`)
        const statusData = await statusResponse.json()

        if (statusData.status === 'complete') {
          clearInterval(pollInterval)
          setUploadProgress(100)
          setUploadStatus('Complete!')

          // Update user usage
          const updatedUser = {
            ...user,
            monthly_usage_count: user.monthly_usage_count + 1,
          }
          setUser(updatedUser)
          localStorage.setItem('user', JSON.stringify(updatedUser))

          // Refresh documents
          await fetchDocuments()

          setTimeout(() => {
            setUploading(false)
            setFile(null)
            setUploadProgress(0)
            setUploadStatus('')
          }, 1000)
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval)
          throw new Error(statusData.error || 'Processing failed')
        }
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
      setUploadStatus('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Study Lesson Generator</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Usage: {user.monthly_usage_count}/{usageLimit} this month
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Study Material</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              id="file-upload"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-gray-600 mb-2">
                {file ? file.name : 'Click to upload or drag and drop'}
              </div>
              <div className="text-sm text-gray-500">
                PDF files only (max 10MB, 50 pages)
              </div>
            </label>
          </div>

          {file && !uploading && (
            <button
              onClick={handleUpload}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Summary
            </button>
          )}

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{uploadStatus}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Documents</h2>

          {documents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">
              No documents yet. Upload your first PDF to get started!
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                  onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{doc.filename}</h3>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedDoc === doc.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {expandedDoc === doc.id && doc.status === 'complete' && (
                  <div className="border-t border-gray-200 p-6">
                    {doc.sections && doc.sections.length > 0 ? (
                      <div className="space-y-4">
                        {doc.sections.map((section: any, index: number) => (
                          <div key={section.id} className="border border-gray-200 rounded-lg">
                            <button
                              onClick={() => {
                                const el = document.getElementById(`section-${section.id}`)
                                el?.classList.toggle('hidden')
                              }}
                              className="w-full p-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {index + 1}. {section.title}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  Pages {section.source_page_start}-{section.source_page_end}
                                </p>
                              </div>
                              <svg
                                className="w-4 h-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                            <div id={`section-${section.id}`} className="hidden p-4 pt-0">
                              <ul className="list-disc list-inside space-y-2 text-gray-700">
                                {section.bullets.map((bullet: any) => (
                                  <li key={bullet.id}>{bullet.text}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No sections available</p>
                    )}
                  </div>
                )}

                {expandedDoc === doc.id && doc.status === 'processing' && (
                  <div className="border-t border-gray-200 p-6 text-center text-gray-500">
                    Processing document...
                  </div>
                )}

                {expandedDoc === doc.id && doc.status === 'failed' && (
                  <div className="border-t border-gray-200 p-6 text-center text-red-500">
                    Processing failed. Please try again.
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ AI-generated summaries may contain errors — always verify against your original material.
          </p>
        </div>
      </main>
    </div>
  )
}
