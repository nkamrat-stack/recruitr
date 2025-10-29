import { useState, useEffect } from 'react'

export default function Candidates() {
  const getBackendURL = () => {
    if (typeof window === 'undefined') return ''
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  
  const BACKEND_URL = getBackendURL()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [openJobs, setOpenJobs] = useState([])
  const [selectedJobs, setSelectedJobs] = useState([])
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetchOpenJobs()
  }, [])

  const fetchOpenJobs = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/`)
      if (response.ok) {
        const data = await response.json()
        const open = data.filter(job => job.status === 'open')
        setOpenJobs(open)
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    if (name.trim()) formData.append('name', name)
    if (email.trim()) formData.append('email', email)
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/ingest/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()
      setResult(data)
      setName('')
      setEmail('')
      setFile(null)
      e.target.reset()
      
      // Show job selection modal if there are open jobs
      if (openJobs.length > 0) {
        setShowJobModal(true)
        setSelectedJobs([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleJobSelection = (jobId) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    )
  }

  const handleApplyToJobs = async () => {
    if (!result || selectedJobs.length === 0) return
    
    setApplying(true)
    try {
      const results = await Promise.all(
        selectedJobs.map(async jobId => {
          const response = await fetch(`${BACKEND_URL}/candidates/${result.id}/apply/${jobId}`, {
            method: 'POST'
          })
          
          const jobTitle = openJobs.find(job => job.id === jobId)?.title || 'Unknown Job'
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
            return { success: false, jobId, jobTitle, error: errorData.detail || 'Failed to apply' }
          }
          
          return { success: true, jobId, jobTitle }
        })
      )
      
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)
      
      if (failed.length > 0) {
        const failedNames = failed.map(f => `${f.jobTitle}: ${f.error}`).join('\n')
        alert(`⚠️ Some applications failed:\n${failedNames}\n\nSuccessful: ${successful.length}/${results.length}`)
      } else {
        const appliedJobNames = successful.map(r => r.jobTitle).join(', ')
        alert(`✅ Successfully applied to ${successful.length} job(s): ${appliedJobNames}`)
      }
      
      setShowJobModal(false)
      setSelectedJobs([])
    } catch (err) {
      alert(`Error applying to jobs: ${err.message}`)
    } finally {
      setApplying(false)
    }
  }

  const handleSkipJobs = () => {
    setShowJobModal(false)
    setSelectedJobs([])
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Upload Candidate Resume</h1>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Candidate Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional - will be extracted from resume"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional - will be extracted from resume"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              required
              accept=".txt,.pdf,.doc,.docx"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Accepted formats: .txt, .pdf, .doc, .docx
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Uploading...' : 'Upload Candidate'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Upload Successful!</h2>
          <div className="space-y-3">
            <p className="text-gray-700">
              <span className="font-semibold">Name:</span> {result.name}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {result.email}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">ID:</span> {result.id}
            </p>
            {result.skills_detected && result.skills_detected.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Skills Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {result.skills_detected.map((skill, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.culture_signals && result.culture_signals.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Culture Signals:</p>
                <div className="flex flex-wrap gap-2">
                  {result.culture_signals.map((signal, idx) => (
                    <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Selection Modal */}
      {showJobModal && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-green-600 mb-2">✅ Resume Uploaded Successfully!</h2>
              <p className="text-gray-600">Apply <span className="font-semibold">{result.name}</span> to jobs:</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {openJobs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No open jobs available at the moment.</p>
              ) : (
                <div className="space-y-3">
                  {openJobs.map(job => (
                    <label
                      key={job.id}
                      className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                        selectedJobs.includes(job.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={() => toggleJobSelection(job.id)}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          <span>📍 {job.location || 'Remote'}</span>
                          <span>•</span>
                          <span>Opened: {formatDate(job.created_at)}</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between gap-4">
              <button
                onClick={handleSkipJobs}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Skip
              </button>
              <button
                onClick={handleApplyToJobs}
                disabled={selectedJobs.length === 0 || applying}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md font-medium hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : `Apply to ${selectedJobs.length > 0 ? selectedJobs.length : ''} Selected Job${selectedJobs.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
