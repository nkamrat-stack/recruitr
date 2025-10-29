import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const getBackendURL = () => {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:8000`
}

const BACKEND_URL = getBackendURL()

const FILE_ARTIFACT_TYPES = [
  { value: 'resume_pdf', label: 'Resume PDF' },
  { value: 'code_sample', label: 'Code Sample File' },
  { value: 'case_study_pdf', label: 'Case Study PDF' },
  { value: 'design_portfolio', label: 'Design Portfolio' },
  { value: 'other_document', label: 'Other Document' },
]

const URL_ARTIFACT_TYPES = [
  { value: 'loom_video', label: 'Loom Video URL' },
  { value: 'portfolio_url', label: 'Portfolio Website' },
  { value: 'github_url', label: 'GitHub Repository' },
  { value: 'linkedin_profile', label: 'LinkedIn Profile' },
  { value: 'project_demo', label: 'Project Demo URL' },
  { value: 'other_url', label: 'Other URL' },
]

const TEXT_ARTIFACT_TYPES = [
  { value: 'resume_text', label: 'Resume Text' },
  { value: 'email_thread', label: 'Email Thread' },
  { value: 'google_doc_response', label: 'Google Doc Response' },
  { value: 'interview_notes', label: 'Interview Notes' },
  { value: 'reference_check', label: 'Reference Check' },
  { value: 'meeting_transcript', label: 'Meeting Transcript' },
  { value: 'other_text', label: 'Other Text' },
]

const ARTIFACT_ICONS = {
  resume_pdf: '📄',
  resume_text: '📄',
  loom_video: '🎥',
  google_doc_response: '📝',
  email_thread: '📧',
  portfolio_url: '🌐',
  github_url: '💻',
  code_sample: '⚡',
  project_demo: '🚀',
  case_study_pdf: '📊',
  design_portfolio: '🎨',
  linkedin_profile: '👤',
  interview_notes: '📋',
  reference_check: '✅',
  meeting_transcript: '🗣️',
  other_document: '📎',
  other_url: '🔗',
  other_text: '📝',
}

export default function CandidateDetail() {
  const router = useRouter()
  const { id } = router.query

  const [candidate, setCandidate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [uploadMethod, setUploadMethod] = useState('file')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploadText, setUploadText] = useState('')
  const [artifactType, setArtifactType] = useState('resume_pdf')
  const [artifactTitle, setArtifactTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [expandedArtifacts, setExpandedArtifacts] = useState({})
  
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [generatingProfile, setGeneratingProfile] = useState(false)

  // Get artifact types based on upload method
  const getArtifactTypes = () => {
    if (uploadMethod === 'file') return FILE_ARTIFACT_TYPES
    if (uploadMethod === 'url') return URL_ARTIFACT_TYPES
    if (uploadMethod === 'text') return TEXT_ARTIFACT_TYPES
    return FILE_ARTIFACT_TYPES
  }

  // Handle tab change and reset artifact type to first option
  const handleTabChange = (method) => {
    setUploadMethod(method)
    if (method === 'file') {
      setArtifactType('resume_pdf')
    } else if (method === 'url') {
      setArtifactType('loom_video')
    } else if (method === 'text') {
      setArtifactType('resume_text')
    }
  }

  useEffect(() => {
    if (id) {
      fetchCandidate()
      fetchProfile()
    }
  }, [id])

  const fetchCandidate = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/candidates/${id}`)
      if (!response.ok) throw new Error('Failed to fetch candidate')
      const data = await response.json()
      setCandidate(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      setProfileLoading(true)
      const response = await fetch(`${BACKEND_URL}/candidates/${id}/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      } else {
        setProfile(null)
      }
    } catch (err) {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleGenerateProfile = async () => {
    try {
      setGeneratingProfile(true)
      const response = await fetch(`${BACKEND_URL}/candidates/${id}/generate-profile`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate profile')
      }

      const data = await response.json()
      setProfile(data)
      alert('Profile generated successfully!')
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setGeneratingProfile(false)
    }
  }

  const handleDelete = async () => {
    const confirmMessage = `Are you sure you want to permanently delete ${candidate.name}?\n\nThis will remove:\n- Candidate record\n- All uploaded materials\n- AI profile\n- Job applications\n- Match scores\n\nThis action cannot be undone!`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/candidates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete candidate')
      }

      const data = await response.json()
      alert(`Successfully deleted ${candidate.name} and ${data.artifacts_deleted} artifacts`)
      router.push('/candidates')
    } catch (err) {
      alert(`Error deleting candidate: ${err.message}`)
    }
  }

  const handleUploadArtifact = async (e) => {
    e.preventDefault()
    setUploading(true)
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      
      if (uploadMethod === 'file' && uploadFile) {
        formData.append('file', uploadFile)
      } else if (uploadMethod === 'url' && uploadUrl) {
        formData.append('url', uploadUrl)
      } else if (uploadMethod === 'text' && uploadText) {
        formData.append('text', uploadText)
      } else {
        throw new Error('Please provide content to upload')
      }

      formData.append('artifact_type', artifactType)
      if (artifactTitle) {
        formData.append('title', artifactTitle)
      }

      const response = await fetch(`${BACKEND_URL}/candidates/${id}/artifacts`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      setUploadSuccess(true)
      setUploadFile(null)
      setUploadUrl('')
      setUploadText('')
      setArtifactTitle('')
      
      setTimeout(() => setUploadSuccess(false), 3000)
      
      fetchCandidate()
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const toggleArtifactExpansion = (artifactId) => {
    setExpandedArtifacts(prev => ({
      ...prev,
      [artifactId]: !prev[artifactId]
    }))
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      interviewed: 'bg-purple-100 text-purple-800',
      offered: 'bg-green-100 text-green-800',
      hired: 'bg-green-600 text-white',
      rejected: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading candidate...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600">{error || 'Candidate not found'}</p>
          <button
            onClick={() => router.push('/candidates')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Back to Candidates
          </button>
        </div>
      </div>
    )
  }

  const artifacts = candidate.artifacts || []

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-8 mb-8 shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-4">{candidate.name}</h1>
            <div className="space-y-2 text-blue-100">
              {candidate.email && (
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Email:</span> {candidate.email}
                </p>
              )}
              {candidate.phone && (
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Phone:</span> {candidate.phone}
                </p>
              )}
              {candidate.location && (
                <p className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span> {candidate.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusBadgeColor(candidate.status)}`}>
              {candidate.status}
            </span>
            <div className="flex gap-2">
              <button className="bg-white text-blue-600 px-6 py-2 rounded-md font-semibold hover:bg-blue-50 transition">
                Edit Profile
              </button>
              <button 
                onClick={handleDelete}
                className="bg-red-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-red-700 transition"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Salary Expectations</h3>
          <p className="text-2xl font-bold text-gray-900">
            {candidate.salary_expectation_min && candidate.salary_expectation_max
              ? `$${candidate.salary_expectation_min}-${candidate.salary_expectation_max}/hr`
              : 'Not specified'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Hours Available</h3>
          <p className="text-2xl font-bold text-gray-900">{candidate.hours_available || 40} hrs/week</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Visa Status</h3>
          <p className="text-2xl font-bold text-gray-900">{candidate.visa_status || 'Not specified'}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-2">Availability</h3>
          <p className="text-2xl font-bold text-gray-900">
            {candidate.availability_start_date
              ? new Date(candidate.availability_start_date).toLocaleDateString()
              : 'Immediate'}
          </p>
        </div>
      </div>

      {/* Add Material Section */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-2 border-blue-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📤 Add Material</h2>
        
        {/* Upload Method Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => handleTabChange('file')}
            className={`px-6 py-3 font-semibold transition ${
              uploadMethod === 'file'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => handleTabChange('url')}
            className={`px-6 py-3 font-semibold transition ${
              uploadMethod === 'url'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste URL
          </button>
          <button
            onClick={() => handleTabChange('text')}
            className={`px-6 py-3 font-semibold transition ${
              uploadMethod === 'text'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Paste Text
          </button>
        </div>

        <form onSubmit={handleUploadArtifact} className="space-y-6">
          {/* Upload Input */}
          {uploadMethod === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose File
              </label>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 transition"
              />
            </div>
          )}

          {uploadMethod === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste URL
              </label>
              <input
                type="url"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {uploadMethod === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Text
              </label>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                rows={6}
                placeholder="Paste content here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Material Type
              </label>
              <select
                value={artifactType}
                onChange={(e) => setArtifactType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {getArtifactTypes().map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title (Optional)
              </label>
              <input
                type="text"
                value={artifactTitle}
                onChange={(e) => setArtifactTitle(e.target.value)}
                placeholder="What is this?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {uploading ? 'Adding Material...' : 'Add Material'}
          </button>

          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
              ✓ Material added successfully!
            </div>
          )}
        </form>
      </div>

      {/* Materials List Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📁 Materials ({artifacts.length})</h2>
        
        {artifacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No materials yet. Add some above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {artifacts.map((artifact) => {
              const skills = artifact.ai_extracted_skills ? JSON.parse(artifact.ai_extracted_skills) : []
              const icon = ARTIFACT_ICONS[artifact.artifact_type] || '📎'
              const isExpanded = expandedArtifacts[artifact.id]

              return (
                <div key={artifact.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {artifact.title || artifact.artifact_type.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Uploaded {new Date(artifact.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {artifact.ai_quality_score && (
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Quality Score</p>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${artifact.ai_quality_score * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700">
                                  {Math.round(artifact.ai_quality_score * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                          {artifact.raw_url && (
                            <a
                              href={artifact.raw_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              View →
                            </a>
                          )}
                          <button
                            onClick={() => toggleArtifactExpansion(artifact.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* AI Summary */}
                      {artifact.ai_summary && (
                        <div className="mt-3 bg-blue-50 rounded-lg p-4">
                          <p className="text-sm font-semibold text-blue-900 mb-1">AI Summary:</p>
                          <p className="text-sm text-gray-700">{artifact.ai_summary}</p>
                        </div>
                      )}

                      {/* AI Skills */}
                      {skills.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Extracted Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                              >
                                {skill.name} ({Math.round(skill.confidence * 100)}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Required Materials Checklist Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">✅ Required Materials</h2>
          <span className={`px-4 py-2 rounded-full font-semibold ${
            (() => {
              const hasResume = artifacts.some(a => a.artifact_type?.toLowerCase().includes('resume'))
              const hasVideo = artifacts.some(a => a.artifact_type?.toLowerCase().includes('loom') || a.artifact_type?.toLowerCase().includes('video'))
              const hasGoogleDoc = artifacts.some(a => a.artifact_type?.toLowerCase().includes('google_doc'))
              const hasEmail = artifacts.some(a => a.artifact_type?.toLowerCase().includes('email'))
              const completedCount = [hasResume, hasVideo, hasGoogleDoc, hasEmail].filter(Boolean).length
              return completedCount === 4 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            })()
          }`}>
            {(() => {
              const hasResume = artifacts.some(a => a.artifact_type?.toLowerCase().includes('resume'))
              const hasVideo = artifacts.some(a => a.artifact_type?.toLowerCase().includes('loom') || a.artifact_type?.toLowerCase().includes('video'))
              const hasGoogleDoc = artifacts.some(a => a.artifact_type?.toLowerCase().includes('google_doc'))
              const hasEmail = artifacts.some(a => a.artifact_type?.toLowerCase().includes('email'))
              const completedCount = [hasResume, hasVideo, hasGoogleDoc, hasEmail].filter(Boolean).length
              return `${completedCount}/4 Complete`
            })()}
          </span>
        </div>

        <div className="space-y-3">
          {/* Resume Check */}
          {(() => {
            const hasResume = artifacts.some(a => a.artifact_type?.toLowerCase().includes('resume'))
            return (
              <div className={`flex items-center gap-4 p-4 rounded-lg ${
                hasResume ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-2xl">
                  {hasResume ? '✅' : '⭕'}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${hasResume ? 'text-green-900' : 'text-gray-700'}`}>
                    Resume Submitted
                  </p>
                  <p className="text-sm text-gray-500">
                    {hasResume ? 'Resume has been uploaded' : 'Waiting for resume upload'}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Loom Video Check */}
          {(() => {
            const hasVideo = artifacts.some(a => a.artifact_type?.toLowerCase().includes('loom') || a.artifact_type?.toLowerCase().includes('video'))
            return (
              <div className={`flex items-center gap-4 p-4 rounded-lg ${
                hasVideo ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-2xl">
                  {hasVideo ? '✅' : '⭕'}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${hasVideo ? 'text-green-900' : 'text-gray-700'}`}>
                    Loom Video Submitted
                  </p>
                  <p className="text-sm text-gray-500">
                    {hasVideo ? 'Video has been uploaded' : 'Waiting for Loom video'}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Google Doc Check */}
          {(() => {
            const hasGoogleDoc = artifacts.some(a => a.artifact_type?.toLowerCase().includes('google_doc'))
            return (
              <div className={`flex items-center gap-4 p-4 rounded-lg ${
                hasGoogleDoc ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-2xl">
                  {hasGoogleDoc ? '✅' : '⭕'}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${hasGoogleDoc ? 'text-green-900' : 'text-gray-700'}`}>
                    Google Doc Response
                  </p>
                  <p className="text-sm text-gray-500">
                    {hasGoogleDoc ? 'Google Doc has been submitted' : 'Waiting for Google Doc response'}
                  </p>
                </div>
              </div>
            )
          })()}

          {/* Email Check */}
          {(() => {
            const hasEmail = artifacts.some(a => a.artifact_type?.toLowerCase().includes('email'))
            return (
              <div className={`flex items-center gap-4 p-4 rounded-lg ${
                hasEmail ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className="text-2xl">
                  {hasEmail ? '✅' : '⭕'}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${hasEmail ? 'text-green-900' : 'text-gray-700'}`}>
                    Email Response
                  </p>
                  <p className="text-sm text-gray-500">
                    {hasEmail ? 'Email response has been received' : 'Waiting for email response'}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* AI Profile Analysis Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-lg p-6 shadow-lg">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">🤖</span> AI Profile Analysis
          </h2>
          <p className="text-purple-100 mt-2">Comprehensive AI-powered insights from all materials</p>
        </div>
        
        {profileLoading ? (
          <div className="bg-white rounded-b-lg shadow-lg p-12 text-center border-x-2 border-b-2 border-purple-200">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        ) : !profile ? (
          <div className="bg-white rounded-b-lg shadow-lg p-12 text-center border-x-2 border-b-2 border-purple-200">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No AI Profile Generated Yet</h3>
            <p className="text-gray-600 mb-2">
              Materials available: <span className="font-bold text-purple-600">{artifacts.length}</span>
            </p>
            
            {/* Helper text based on materials count */}
            {artifacts.length > 0 ? (
              <p className="text-blue-600 mb-6 text-lg font-semibold">
                ✨ Ready to analyze {artifacts.length} {artifacts.length === 1 ? 'material' : 'materials'}
              </p>
            ) : (
              <p className="text-orange-600 mb-6 text-lg font-semibold">
                ⬆️ Upload materials above before analyzing
              </p>
            )}
            
            <p className="text-gray-500 mb-6 max-w-2xl mx-auto">
              Generate a comprehensive AI analysis based on all uploaded materials. 
              The AI will analyze skills, experience, communication style, and provide personalized insights.
            </p>
            <button
              onClick={handleGenerateProfile}
              disabled={generatingProfile || artifacts.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition shadow-lg"
            >
              {generatingProfile ? 'Analyzing...' : 'Analyze All Materials with AI'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-b-lg shadow-lg p-8 space-y-6 border-x-2 border-b-2 border-purple-200">
            {/* Overall Summary Card */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-purple-200 text-sm mb-1">Best Role Fit</p>
                  <p className="text-3xl font-bold">{profile.best_role_fit || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-purple-200 text-sm mb-1">Years of Experience</p>
                  <p className="text-3xl font-bold">{profile.years_experience || 0} years</p>
                </div>
                <div>
                  <p className="text-purple-200 text-sm mb-2">Profile Completeness</p>
                  <div className="w-full bg-purple-800 rounded-full h-4 mb-2">
                    <div
                      className="bg-white h-4 rounded-full transition-all"
                      style={{ width: `${(profile.profile_completeness || 0) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm">{Math.round((profile.profile_completeness || 0) * 100)}% Complete</p>
                </div>
              </div>
              {profile.last_ai_analysis && (
                <p className="text-purple-200 text-sm mt-4">
                  Last analyzed: {new Date(profile.last_ai_analysis).toLocaleString()}
                </p>
              )}
            </div>

            {/* Technical Skills Section */}
            {profile.technical_skills && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-md p-8 border border-purple-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>💻</span> Technical Skills
                </h3>
                <div className="flex flex-wrap gap-3">
                  {JSON.parse(profile.technical_skills).map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800 px-5 py-2 rounded-full font-semibold text-lg shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Scores Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {profile.writing_quality_score !== null && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-3">✍️ Writing Quality</p>
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                        style={{ width: `${(profile.writing_quality_score || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((profile.writing_quality_score || 0) * 100)}%
                  </p>
                </div>
              )}
              {profile.code_quality_score !== null && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-3">⚡ Code Quality</p>
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${(profile.code_quality_score || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((profile.code_quality_score || 0) * 100)}%
                  </p>
                </div>
              )}
              {profile.verbal_quality_score !== null && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-3">🗣️ Communication</p>
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all"
                        style={{ width: `${(profile.verbal_quality_score || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((profile.verbal_quality_score || 0) * 100)}%
                  </p>
                </div>
              )}
              {profile.growth_potential_score !== null && (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-500 mb-3">📈 Growth Potential</p>
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all"
                        style={{ width: `${(profile.growth_potential_score || 0) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.round((profile.growth_potential_score || 0) * 100)}%
                  </p>
                </div>
              )}
            </div>

            {/* Strengths Card */}
            {profile.strengths && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg shadow-md p-8">
                <h3 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
                  <span>💪</span> Strengths
                </h3>
                <p className="text-gray-800 text-lg leading-relaxed">{profile.strengths}</p>
              </div>
            )}

            {/* Concerns Card */}
            {profile.concerns && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg shadow-md p-8">
                <h3 className="text-2xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Areas for Consideration
                </h3>
                <p className="text-gray-800 text-lg leading-relaxed">{profile.concerns}</p>
              </div>
            )}

            {/* Culture Signals & Personality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.culture_signals && (
                <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🎯</span> Culture Signals
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(profile.culture_signals).map((signal, idx) => (
                      <span
                        key={idx}
                        className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-medium"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.personality_traits && (
                <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span>✨</span> Personality Traits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(profile.personality_traits).map((trait, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-medium"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Communication Style */}
            {profile.communication_style && (
              <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💬</span> Communication Style
                </h3>
                <p className="text-gray-700 text-lg">{profile.communication_style}</p>
              </div>
            )}

            {/* Update AI Analysis Button */}
            <div className="text-center pt-4 border-t-2 border-purple-100">
              <button
                onClick={handleGenerateProfile}
                disabled={generatingProfile}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition shadow-lg"
              >
                {generatingProfile ? 'Updating Analysis...' : '🔄 Update AI Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
