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
  const [showImportModal, setShowImportModal] = useState(false)
  const [linkedinText, setLinkedinText] = useState('')
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)

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

  const [evaluationLevels, setEvaluationLevels] = useState([])
  const [screeningQuestions, setScreeningQuestions] = useState([])
  const [collapsedLevels, setCollapsedLevels] = useState({})
  const [customDeliverableInputs, setCustomDeliverableInputs] = useState({})

  const PRESET_DELIVERABLES = [
    { id: 'resume', label: 'Resume' },
    { id: 'loom_video', label: 'Loom Video' },
    { id: 'cover_letter', label: 'Cover Letter' },
    { id: 'questionnaire', label: 'Questionnaire' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'github', label: 'GitHub' },
    { id: 'code_sample', label: 'Code Sample' },
    { id: 'interview_transcript', label: 'Interview Transcript' },
  ]

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
    
    if (!validateEvaluationLevels()) {
      return
    }

    try {
      const payload = {
        ...formData,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        hours_required: parseInt(formData.hours_required),
        start_date_needed: formData.start_date_needed || null,
        evaluation_levels: evaluationLevels,
        screening_questions: screeningQuestions.length > 0 ? screeningQuestions : null,
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
    
    if (job.evaluation_levels && job.evaluation_levels.length > 0) {
      setEvaluationLevels(job.evaluation_levels)
    } else {
      setEvaluationLevels([{
        level_number: 1,
        level_name: 'Initial Screen',
        required_deliverables: ['resume'],
        optional_deliverables: [],
        advance_count: null,
      }])
    }
    
    if (job.screening_questions && job.screening_questions.length > 0) {
      setScreeningQuestions(job.screening_questions)
    } else {
      setScreeningQuestions([])
    }
    
    setCollapsedLevels({})
    setCustomDeliverableInputs({})
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
    setEvaluationLevels([])
    setScreeningQuestions([])
    setCollapsedLevels({})
    setCustomDeliverableInputs({})
  }

  const openCreateModal = () => {
    setEditingJob(null)
    resetForm()
    setEvaluationLevels([{
      level_number: 1,
      level_name: 'Initial Screen',
      required_deliverables: ['resume'],
      optional_deliverables: [],
      advance_count: null,
    }])
    setShowModal(true)
  }

  const handleImportFromLinkedIn = async () => {
    if (!linkedinText.trim()) {
      alert('Please paste a job description first')
      return
    }

    setImporting(true)
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/parse-linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedin_text: linkedinText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to parse LinkedIn job post')
      }

      const parsed = await response.json()
      
      setFormData({
        title: parsed.job_title || '',
        description: parsed.description || '',
        required_skills: Array.isArray(parsed.required_skills) ? parsed.required_skills.join(', ') : '',
        nice_to_have_skills: Array.isArray(parsed.nice_to_have_skills) ? parsed.nice_to_have_skills.join(', ') : '',
        culture_requirements: '',
        salary_min: parsed.salary_min || '',
        salary_max: parsed.salary_max || '',
        hours_required: 40,
        location: parsed.location || '',
        visa_sponsorship_available: false,
        start_date_needed: '',
        status: 'open',
      })

      const mustHaveQuestions = parsed.must_have_questions || []
      const preferredQuestions = parsed.preferred_questions || []
      
      const allQuestions = [
        ...mustHaveQuestions.map(q => ({ ...q, is_required: true })),
        ...preferredQuestions.map(q => ({ ...q, is_required: false }))
      ]
      setScreeningQuestions(allQuestions)
      
      const initialLevel = {
        level_number: 1,
        level_name: 'Initial Screen',
        required_deliverables: ['resume'],
        optional_deliverables: [],
        advance_count: null,
      }

      if (mustHaveQuestions.length > 0) {
        initialLevel.required_deliverables.push('questionnaire')
      }

      if (preferredQuestions.length > 0) {
        initialLevel.optional_deliverables.push('questionnaire')
      }

      setEvaluationLevels([initialLevel])

      setShowImportModal(false)
      setLinkedinText('')
      setEditingJob(null)
      setShowModal(true)
      
    } catch (err) {
      alert(`Error parsing LinkedIn job post: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleGenerateDescription = async () => {
    if (!formData.title) {
      alert('Please enter a job title first')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          required_skills: formData.required_skills || null,
          nice_to_have_skills: formData.nice_to_have_skills || null,
          culture_requirements: formData.culture_requirements || null,
          salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
          hours_required: formData.hours_required ? parseInt(formData.hours_required) : null,
          location: formData.location || null,
          visa_sponsorship_available: formData.visa_sponsorship_available || false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate description')
      }

      const result = await response.json()
      setFormData({ ...formData, description: result.description })
      
    } catch (err) {
      alert(`Error generating description: ${err.message}`)
    } finally {
      setGenerating(false)
    }
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

  const addEvaluationLevel = () => {
    const newLevel = {
      level_number: evaluationLevels.length + 1,
      level_name: `Level ${evaluationLevels.length + 1}`,
      required_deliverables: [],
      optional_deliverables: [],
      advance_count: null,
    }
    setEvaluationLevels([...evaluationLevels, newLevel])
  }

  const removeEvaluationLevel = (levelNumber) => {
    if (evaluationLevels.length <= 1) {
      alert('At least one evaluation level is required')
      return
    }
    const updatedLevels = evaluationLevels
      .filter(level => level.level_number !== levelNumber)
      .map((level, index) => ({
        ...level,
        level_number: index + 1,
      }))
    setEvaluationLevels(updatedLevels)
  }

  const moveLevelUp = (levelNumber) => {
    if (levelNumber === 1) return
    const updatedLevels = [...evaluationLevels]
    const currentIndex = levelNumber - 1
    const previousIndex = currentIndex - 1
    const temp = updatedLevels[currentIndex]
    updatedLevels[currentIndex] = { ...updatedLevels[previousIndex], level_number: levelNumber }
    updatedLevels[previousIndex] = { ...temp, level_number: levelNumber - 1 }
    setEvaluationLevels(updatedLevels)
  }

  const moveLevelDown = (levelNumber) => {
    if (levelNumber === evaluationLevels.length) return
    const updatedLevels = [...evaluationLevels]
    const currentIndex = levelNumber - 1
    const nextIndex = currentIndex + 1
    const temp = updatedLevels[currentIndex]
    updatedLevels[currentIndex] = { ...updatedLevels[nextIndex], level_number: levelNumber }
    updatedLevels[nextIndex] = { ...temp, level_number: levelNumber + 1 }
    setEvaluationLevels(updatedLevels)
  }

  const togglePresetDeliverable = (levelNumber, deliverableId, isRequired) => {
    const updatedLevels = evaluationLevels.map(level => {
      if (level.level_number !== levelNumber) return level
      
      const targetArray = isRequired ? 'required_deliverables' : 'optional_deliverables'
      const otherArray = isRequired ? 'optional_deliverables' : 'required_deliverables'
      
      const currentArray = level[targetArray] || []
      const otherCurrentArray = level[otherArray] || []
      
      if (currentArray.includes(deliverableId)) {
        return {
          ...level,
          [targetArray]: currentArray.filter(id => id !== deliverableId),
        }
      } else {
        return {
          ...level,
          [targetArray]: [...currentArray, deliverableId],
          [otherArray]: otherCurrentArray.filter(id => id !== deliverableId),
        }
      }
    })
    setEvaluationLevels(updatedLevels)
  }

  const addCustomDeliverable = (levelNumber, isRequired) => {
    const inputKey = `${levelNumber}-${isRequired ? 'required' : 'optional'}`
    const customValue = customDeliverableInputs[inputKey]
    
    if (!customValue || !customValue.trim()) {
      alert('Please enter a deliverable name')
      return
    }

    const updatedLevels = evaluationLevels.map(level => {
      if (level.level_number !== levelNumber) return level
      
      const targetArray = isRequired ? 'required_deliverables' : 'optional_deliverables'
      const currentArray = level[targetArray] || []
      
      return {
        ...level,
        [targetArray]: [...currentArray, `custom:${customValue.trim()}`],
      }
    })
    
    setEvaluationLevels(updatedLevels)
    setCustomDeliverableInputs({ ...customDeliverableInputs, [inputKey]: '' })
  }

  const removeDeliverable = (levelNumber, deliverableId, isRequired) => {
    const updatedLevels = evaluationLevels.map(level => {
      if (level.level_number !== levelNumber) return level
      
      const targetArray = isRequired ? 'required_deliverables' : 'optional_deliverables'
      const currentArray = level[targetArray] || []
      
      return {
        ...level,
        [targetArray]: currentArray.filter(id => id !== deliverableId),
      }
    })
    setEvaluationLevels(updatedLevels)
  }

  const updateAdvanceCount = (levelNumber, value) => {
    const updatedLevels = evaluationLevels.map(level => {
      if (level.level_number !== levelNumber) return level
      return {
        ...level,
        advance_count: value === '' || value === null ? null : parseInt(value),
      }
    })
    setEvaluationLevels(updatedLevels)
  }

  const updateLevelName = (levelNumber, name) => {
    const updatedLevels = evaluationLevels.map(level => {
      if (level.level_number !== levelNumber) return level
      return {
        ...level,
        level_name: name,
      }
    })
    setEvaluationLevels(updatedLevels)
  }

  const toggleLevelCollapsed = (levelNumber) => {
    setCollapsedLevels({
      ...collapsedLevels,
      [levelNumber]: !collapsedLevels[levelNumber],
    })
  }

  const validateEvaluationLevels = () => {
    if (evaluationLevels.length === 0) {
      alert('At least one evaluation level is required')
      return false
    }

    for (const level of evaluationLevels) {
      if (!level.required_deliverables || level.required_deliverables.length === 0) {
        alert(`Level ${level.level_number} must have at least one required deliverable`)
        return false
      }
    }

    return true
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-blue-50 transition shadow-md"
          >
            📋 Import from LinkedIn
          </button>
          <button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
          >
            + Create New Job
          </button>
        </div>
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Description *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={generating || !formData.title}
                    className="text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1.5 rounded-md hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? '✨ Generating...' : '🤖 Generate Description'}
                  </button>
                </div>
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

              <div className="border-t border-gray-300 pt-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Evaluation Pipeline</h3>
                    <p className="text-sm text-gray-600">Define the stages candidates will go through</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {evaluationLevels.map((level, index) => {
                    const isCollapsed = collapsedLevels[level.level_number]
                    const isLastLevel = index === evaluationLevels.length - 1
                    
                    return (
                      <div key={level.level_number} className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 flex justify-between items-center border-b border-gray-300">
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-600 text-white font-bold px-3 py-1 rounded-full text-sm">
                              {level.level_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleLevelCollapsed(level.level_number)}
                              className="text-gray-700 hover:text-gray-900"
                            >
                              {isCollapsed ? '▶' : '▼'}
                            </button>
                            <input
                              type="text"
                              value={level.level_name}
                              onChange={(e) => updateLevelName(level.level_number, e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="Level name"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {evaluationLevels.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => moveLevelUp(level.level_number)}
                                  disabled={level.level_number === 1}
                                  className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveLevelDown(level.level_number)}
                                  disabled={level.level_number === evaluationLevels.length}
                                  className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeEvaluationLevel(level.level_number)}
                                  className="px-3 py-1 bg-red-50 text-red-600 border border-red-300 rounded hover:bg-red-100"
                                  title="Remove level"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="p-4 bg-white space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Required Deliverables *
                              </label>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {PRESET_DELIVERABLES.map(preset => (
                                  <label key={preset.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={level.required_deliverables?.includes(preset.id) || false}
                                      onChange={() => togglePresetDeliverable(level.level_number, preset.id, true)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{preset.label}</span>
                                  </label>
                                ))}
                              </div>
                              
                              {level.required_deliverables?.filter(d => d.startsWith('custom:')).map(customDeliverable => (
                                <div key={customDeliverable} className="flex items-center gap-2 bg-blue-50 p-2 rounded mb-2">
                                  <span className="text-sm text-gray-700 flex-1">
                                    {customDeliverable.replace('custom:', '')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeDeliverable(level.level_number, customDeliverable, true)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}

                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={customDeliverableInputs[`${level.level_number}-required`] || ''}
                                  onChange={(e) => setCustomDeliverableInputs({
                                    ...customDeliverableInputs,
                                    [`${level.level_number}-required`]: e.target.value
                                  })}
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                                  placeholder="Custom deliverable name"
                                />
                                <button
                                  type="button"
                                  onClick={() => addCustomDeliverable(level.level_number, true)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                >
                                  + Add Custom
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Optional Deliverables
                              </label>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                {PRESET_DELIVERABLES.map(preset => (
                                  <label key={preset.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={level.optional_deliverables?.includes(preset.id) || false}
                                      onChange={() => togglePresetDeliverable(level.level_number, preset.id, false)}
                                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">{preset.label}</span>
                                  </label>
                                ))}
                              </div>
                              
                              {level.optional_deliverables?.filter(d => d.startsWith('custom:')).map(customDeliverable => (
                                <div key={customDeliverable} className="flex items-center gap-2 bg-purple-50 p-2 rounded mb-2">
                                  <span className="text-sm text-gray-700 flex-1">
                                    {customDeliverable.replace('custom:', '')}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeDeliverable(level.level_number, customDeliverable, false)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}

                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={customDeliverableInputs[`${level.level_number}-optional`] || ''}
                                  onChange={(e) => setCustomDeliverableInputs({
                                    ...customDeliverableInputs,
                                    [`${level.level_number}-optional`]: e.target.value
                                  })}
                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 text-sm"
                                  placeholder="Custom deliverable name"
                                />
                                <button
                                  type="button"
                                  onClick={() => addCustomDeliverable(level.level_number, false)}
                                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                                >
                                  + Add Custom
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {isLastLevel ? 'Advance Count (All for final level)' : 'Number to Advance'}
                              </label>
                              <input
                                type="number"
                                value={level.advance_count === null ? '' : level.advance_count}
                                onChange={(e) => updateAdvanceCount(level.level_number, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder={isLastLevel ? "Leave empty for 'All'" : "Number of candidates to advance"}
                              />
                              {isLastLevel && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Leave empty to advance all remaining candidates
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  <button
                    type="button"
                    onClick={addEvaluationLevel}
                    className="w-full py-3 border-2 border-dashed border-blue-400 text-blue-600 rounded-lg hover:border-blue-600 hover:bg-blue-50 font-semibold transition"
                  >
                    + Add Level
                  </button>
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

      {/* Import from LinkedIn Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                📋 Import from LinkedIn
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Paste a job description from LinkedIn or any other source, and we'll extract the fields using AI.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  rows={12}
                  value={linkedinText}
                  onChange={(e) => setLinkedinText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Paste the complete job description here...&#10;&#10;Example:&#10;Senior Software Engineer&#10;&#10;We are seeking a talented Senior Software Engineer...&#10;&#10;Requirements:&#10;- 5+ years of experience with Python&#10;- Strong knowledge of React and TypeScript&#10;..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false)
                    setLinkedinText('')
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportFromLinkedIn}
                  disabled={importing || !linkedinText.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? '✨ Parsing with AI...' : '🤖 Parse with AI'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
