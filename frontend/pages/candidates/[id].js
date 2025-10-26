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

  const profile = candidate.profile
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
            <button className="bg-white text-blue-600 px-6 py-2 rounded-md font-semibold hover:bg-blue-50 transition">
              Edit Profile
            </button>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Material</h2>
        
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
            {uploading ? 'Uploading & Analyzing...' : 'Upload & Analyze with AI'}
          </button>

          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
              ✓ Material uploaded and analyzed successfully!
            </div>
          )}
        </form>
      </div>

      {/* Materials List Section */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Materials ({artifacts.length})</h2>
        
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
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
                            >
                              Visit
                            </a>
                          )}
                        </div>
                      </div>

                      {/* AI Summary */}
                      {artifact.ai_summary && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleArtifactExpansion(artifact.id)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm mb-2"
                          >
                            {isExpanded ? '▼ Hide Summary' : '▶ Show AI Summary'}
                          </button>
                          {isExpanded && (
                            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                              {artifact.ai_summary}
                            </p>
                          )}
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

      {/* AI Profile Section */}
      {profile && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">AI-Generated Profile</h2>
            <button className="bg-purple-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-purple-700 transition">
              Regenerate Profile
            </button>
          </div>

          {/* Technical Skills */}
          {profile.technical_skills && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Skills</h3>
              <div className="flex flex-wrap gap-2">
                {JSON.parse(profile.technical_skills).map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {profile.strengths && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Strengths</h3>
              <p className="text-gray-700 bg-white p-4 rounded-lg">{profile.strengths}</p>
            </div>
          )}

          {/* Concerns */}
          {profile.concerns && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Concerns</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">{profile.concerns}</p>
              </div>
            </div>
          )}

          {/* Quality Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {profile.writing_quality_score && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Writing Quality</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(profile.writing_quality_score * 100)}%
                </p>
              </div>
            )}
            {profile.code_quality_score && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Code Quality</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(profile.code_quality_score * 100)}%
                </p>
              </div>
            )}
            {profile.growth_potential_score && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Growth Potential</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(profile.growth_potential_score * 100)}%
                </p>
              </div>
            )}
            {profile.profile_completeness && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Profile Completeness</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(profile.profile_completeness * 100)}%
                </p>
              </div>
            )}
          </div>

          {/* Best Role Fit */}
          {profile.best_role_fit && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Best Role Fit</h3>
              <p className="text-xl text-purple-700 font-semibold">{profile.best_role_fit}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
