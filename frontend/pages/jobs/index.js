import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function JobsList() {
  const getBackendURL = () => {
    if (typeof window === 'undefined') return ''
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  
  const BACKEND_URL = getBackendURL()
  const router = useRouter()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    required_skills: '',
    nice_to_have_skills: '',
    culture_requirements: '',
    salary_min: '',
    salary_max: '',
    hours_required: 40,
    location: '',
    visa_sponsorship_available: false,
    start_date_needed: '',
    status: 'open',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/jobs/`)
      if (!response.ok) throw new Error('Failed to fetch jobs')
      const data = await response.json()
      setJobs(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        hours_required: parseInt(formData.hours_required),
        start_date_needed: formData.start_date_needed || null,
      }

      const url = editingJob 
        ? `${BACKEND_URL}/jobs/${editingJob.id}`
        : `${BACKEND_URL}/jobs/`
      
      const method = editingJob ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save job')
      }

      setShowModal(false)
      setEditingJob(null)
      resetForm()
      fetchJobs()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const handleEdit = (job) => {
    setEditingJob(job)
    setFormData({
      title: job.title || '',
      description: job.description || '',
      required_skills: job.required_skills || '',
      nice_to_have_skills: job.nice_to_have_skills || '',
      culture_requirements: job.culture_requirements || '',
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      hours_required: job.hours_required || 40,
      location: job.location || '',
      visa_sponsorship_available: job.visa_sponsorship_available || false,
      start_date_needed: job.start_date_needed || '',
      status: job.status || 'open',
    })
    setShowModal(true)
  }

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete job')

      fetchJobs()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      required_skills: '',
      nice_to_have_skills: '',
      culture_requirements: '',
      salary_min: '',
      salary_max: '',
      hours_required: 40,
      location: '',
      visa_sponsorship_available: false,
      start_date_needed: '',
      status: 'open',
    })
  }

  const openCreateModal = () => {
    setEditingJob(null)
    resetForm()
    setShowModal(true)
  }

  const getSkillsArray = (skillsString) => {
    if (!skillsString) return []
    return skillsString.split(',').map(s => s.trim()).filter(s => s)
  }

  const getStatusColor = (status) => {
    return status === 'open'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Jobs</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchJobs}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-600 mt-2">{jobs.length} total jobs</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
        >
          + Create New Job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-semibold text-gray-900">No jobs yet</h3>
          <p className="mt-2 text-gray-600">Get started by creating your first job posting.</p>
          <button
            onClick={openCreateModal}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            Create First Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const requiredSkills = getSkillsArray(job.required_skills)
            const displaySkills = requiredSkills.slice(0, 3)
            const remainingCount = requiredSkills.length - 3

            return (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">
                      {job.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>

                  {/* Salary */}
                  {(job.salary_min || job.salary_max) && (
                    <div className="text-lg font-semibold text-blue-600 mb-3">
                      ${job.salary_min || '?'} - ${job.salary_max || '?'}/hr
                    </div>
                  )}

                  {/* Location */}
                  {job.location && (
                    <div className="text-sm text-gray-600 mb-3 flex items-center gap-1">
                      <span>📍</span>
                      {job.location}
                    </div>
                  )}

                  {/* Skills */}
                  {displaySkills.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {displaySkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="text-xs text-gray-500 px-2 py-1">
                            +{remainingCount} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Matches */}
                  <div className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">{job.match_count}</span> matched candidates
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/jobs/${job.id}/matches`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-semibold"
                    >
                      View Matches
                    </button>
                    <button
                      onClick={() => handleEdit(job)}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="bg-red-50 text-red-600 px-3 py-2 rounded-md hover:bg-red-100 transition"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingJob ? 'Edit Job' : 'Create New Job'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Senior Full-Stack Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Skills
                  </label>
                  <input
                    type="text"
                    value={formData.required_skills}
                    onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Python, React, Docker (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nice-to-Have Skills
                  </label>
                  <input
                    type="text"
                    value={formData.nice_to_have_skills}
                    onChange={(e) => setFormData({ ...formData, nice_to_have_skills: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Kubernetes, AWS (comma-separated)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Culture Requirements
                </label>
                <textarea
                  rows={3}
                  value={formData.culture_requirements}
                  onChange={(e) => setFormData({ ...formData, culture_requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe culture fit, working style, team dynamics..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Salary ($/hr)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Salary ($/hr)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Required
                  </label>
                  <input
                    type="number"
                    value={formData.hours_required}
                    onChange={(e) => setFormData({ ...formData, hours_required: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Remote, San Francisco, CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date Needed
                  </label>
                  <input
                    type="date"
                    value={formData.start_date_needed}
                    onChange={(e) => setFormData({ ...formData, start_date_needed: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="visa"
                    checked={formData.visa_sponsorship_available}
                    onChange={(e) => setFormData({ ...formData, visa_sponsorship_available: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="visa" className="ml-2 text-sm text-gray-700">
                    Visa Sponsorship Available
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingJob(null)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700"
                >
                  {editingJob ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
