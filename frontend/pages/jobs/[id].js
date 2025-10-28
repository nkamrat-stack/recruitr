import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import DOMPurify from 'isomorphic-dompurify'

export default function JobDetail() {
  const getBackendURL = () => {
    if (typeof window === 'undefined') return ''
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  
  const BACKEND_URL = getBackendURL()
  const router = useRouter()
  const { id } = router.query
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('description')
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState(null)
  const [editingWeights, setEditingWeights] = useState(false)
  const [editedRequiredQuals, setEditedRequiredQuals] = useState([])
  const [editedPreferredQuals, setEditedPreferredQuals] = useState([])
  const [editedCompetencies, setEditedCompetencies] = useState([])
  const [savingWeights, setSavingWeights] = useState(false)

  useEffect(() => {
    if (id) {
      fetchJob()
    }
  }, [id])

  const fetchJob = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/jobs/${id}`)
      if (!response.ok) throw new Error('Failed to fetch job')
      const data = await response.json()
      setJob(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExtractRequirements = async () => {
    setExtracting(true)
    setExtractError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/${id}/extract-requirements`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to extract requirements')
      }

      // Reload the job to show extracted data
      await fetchJob()
      setActiveTab('requirements') // Switch to requirements tab to show results
      
    } catch (err) {
      setExtractError(err.message)
      alert(`Error: ${err.message}`)
    } finally {
      setExtracting(false)
    }
  }

  const startEditingWeights = () => {
    setEditingWeights(true)
    setEditedRequiredQuals(JSON.parse(JSON.stringify(job.required_qualifications || [])))
    setEditedPreferredQuals(JSON.parse(JSON.stringify(job.preferred_qualifications || [])))
    setEditedCompetencies(JSON.parse(JSON.stringify(job.competencies || [])))
  }

  const cancelEditingWeights = () => {
    setEditingWeights(false)
    setEditedRequiredQuals([])
    setEditedPreferredQuals([])
    setEditedCompetencies([])
  }

  const saveWeights = async () => {
    setSavingWeights(true)
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/${id}/update-weights`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          required_qualifications: editedRequiredQuals,
          preferred_qualifications: editedPreferredQuals,
          competencies: editedCompetencies,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save weights')
      }

      const data = await response.json()
      setJob(data.job)
      setEditingWeights(false)
      alert('Weights updated successfully!')
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setSavingWeights(false)
    }
  }

  const updateRequiredQualWeight = (index, newWeight) => {
    const updated = [...editedRequiredQuals]
    updated[index] = { ...updated[index], weight: parseInt(newWeight) }
    setEditedRequiredQuals(updated)
  }

  const updatePreferredQualWeight = (index, newWeight) => {
    const updated = [...editedPreferredQuals]
    updated[index] = { ...updated[index], weight: parseInt(newWeight) }
    setEditedPreferredQuals(updated)
  }

  const updateCompetencyImportance = (index, newImportance) => {
    const updated = [...editedCompetencies]
    updated[index] = { ...updated[index], importance: parseInt(newImportance) }
    setEditedCompetencies(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading job details...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Job not found'}
          </div>
          <Link href="/jobs" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Jobs
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'description', label: 'Job Description' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'screening', label: 'Screening Questions' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/jobs" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Jobs
          </Link>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex gap-4 text-sm text-gray-600">
              {job.location && (
                <span className="flex items-center">
                  📍 {job.location}
                </span>
              )}
              {job.salary_min && job.salary_max && (
                <span className="flex items-center">
                  💰 ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                </span>
              )}
              {job.hours_required && (
                <span className="flex items-center">
                  ⏰ {job.hours_required} hrs/week
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                job.status === 'open' ? 'bg-green-100 text-green-700' :
                job.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {job.status?.toUpperCase()}
              </span>
              {job.visa_sponsorship_available && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  VISA SPONSORSHIP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Extraction Status Banner */}
        {job.extraction_status === 'not_extracted' && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">⚡</div>
                <div>
                  <h3 className="text-lg font-bold text-orange-900">Requirements Not Extracted Yet</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Click "Extract Requirements" to analyze this job with AI (~20 seconds). Required before matching candidates.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExtractRequirements}
                disabled={extracting}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg transition-all"
              >
                {extracting ? '🔄 Extracting...' : '✨ Extract Requirements'}
              </button>
            </div>
          </div>
        )}

        {job.extraction_status === 'extracting' && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-3xl">🔄</div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Extracting Requirements...</h3>
                <p className="text-sm text-blue-700 mt-1">AI is analyzing the job description. This takes about 20 seconds.</p>
              </div>
            </div>
          </div>
        )}

        {job.extraction_status === 'extracted' && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Requirements Extracted Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">View detailed requirements in the tabs below or match candidates.</p>
                </div>
              </div>
              <button
                onClick={handleExtractRequirements}
                disabled={extracting}
                className="px-4 py-2 bg-white border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
              >
                {extracting ? '🔄 Re-extracting...' : '🔄 Re-extract'}
              </button>
            </div>
          </div>
        )}

        {job.extraction_status === 'failed' && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">❌</div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Extraction Failed</h3>
                  <p className="text-sm text-red-700 mt-1">There was an error extracting requirements. Please try again.</p>
                </div>
              </div>
              <button
                onClick={handleExtractRequirements}
                disabled={extracting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {extracting ? '🔄 Retrying...' : '🔄 Try Again'}
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Description Tab */}
            {activeTab === 'description' && (
              <div>
                {job.display_description ? (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(job.display_description, {
                        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'div', 'span'],
                        ALLOWED_ATTR: ['class', 'style']
                      }) 
                    }}
                    style={{
                      lineHeight: '1.7',
                      color: '#374151'
                    }}
                  />
                ) : job.description ? (
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No description available</p>
                )}
              </div>
            )}

            {/* Requirements Tab */}
            {activeTab === 'requirements' && (
              <div className="space-y-8">
                
                {/* Edit Weights Button */}
                {job.extraction_status === 'extracted' && (
                  <div className="flex justify-end gap-3 pb-4 border-b border-gray-200">
                    {!editingWeights ? (
                      <button
                        onClick={startEditingWeights}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-md hover:from-purple-700 hover:to-blue-700 transition font-semibold flex items-center gap-2"
                      >
                        ✏️ Edit Weights & Importance
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={cancelEditingWeights}
                          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveWeights}
                          disabled={savingWeights}
                          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-md hover:from-green-700 hover:to-green-800 transition font-semibold disabled:opacity-50"
                        >
                          {savingWeights ? 'Saving...' : '💾 Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                )}
                
                {/* Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Responsibilities</h3>
                    <div className="space-y-4">
                      {job.responsibilities.map((resp, idx) => (
                        <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                          <h4 className="font-semibold text-gray-900 mb-2">{resp.category}</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            {resp.tasks.map((task, i) => (
                              <li key={i}>{task}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required Qualifications */}
                {(editingWeights ? editedRequiredQuals : job.required_qualifications)?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Required Qualifications</h3>
                    <div className="space-y-3">
                      {(editingWeights ? editedRequiredQuals : job.required_qualifications).map((qual, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {qual.weight || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-medium rounded">
                                {qual.type}
                              </span>
                              {qual.years_min && qual.years_max && (
                                <span className="text-sm text-gray-600">
                                  {qual.years_min}-{qual.years_max} years
                                </span>
                              )}
                              {qual.manually_set ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  ✓ Manually Set
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  🤖 AI Estimated
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800">{qual.description}</p>
                            {editingWeights && (
                              <div className="mt-3">
                                <label className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700 w-20">Weight:</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={qual.weight || 5}
                                    onChange={(e) => updateRequiredQualWeight(idx, e.target.value)}
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-bold text-red-600 w-8">{qual.weight || 5}/10</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred Qualifications */}
                {(editingWeights ? editedPreferredQuals : job.preferred_qualifications)?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">⭐ Preferred Qualifications</h3>
                    <div className="space-y-3">
                      {(editingWeights ? editedPreferredQuals : job.preferred_qualifications).map((qual, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {qual.weight || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded">
                                {qual.type}
                              </span>
                              {qual.manually_set ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  ✓ Manually Set
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  🤖 AI Estimated
                                </span>
                              )}
                            </div>
                            <p className="text-gray-800">{qual.description}</p>
                            {editingWeights && (
                              <div className="mt-3">
                                <label className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-gray-700 w-20">Weight:</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={qual.weight || 5}
                                    onChange={(e) => updatePreferredQualWeight(idx, e.target.value)}
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-bold text-blue-600 w-8">{qual.weight || 5}/10</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competencies */}
                {(editingWeights ? editedCompetencies : job.competencies)?.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Competencies & Soft Skills</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(editingWeights ? editedCompetencies : job.competencies).map((comp, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{comp.name}</h4>
                            <div className="flex items-center gap-1">
                              {[...Array(10)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-2 h-4 rounded-sm ${
                                    i < comp.importance ? 'bg-green-500' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {comp.manually_set ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                                ✓ Manually Set
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                🤖 AI Estimated
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{comp.description}</p>
                          {editingWeights && (
                            <div className="mt-3">
                              <label className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 w-24">Importance:</span>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  value={comp.importance || 5}
                                  onChange={(e) => updateCompetencyImportance(idx, e.target.value)}
                                  className="flex-1"
                                />
                                <span className="text-sm font-bold text-green-600 w-8">{comp.importance || 5}/10</span>
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success Milestones */}
                {job.success_milestones && job.success_milestones.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Success Milestones</h3>
                    <div className="space-y-4">
                      {job.success_milestones.map((milestone, idx) => (
                        <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                          <h4 className="font-bold text-green-700 mb-2">{milestone.timeframe}</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            {milestone.expectations.map((exp, i) => (
                              <li key={i}>{exp}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Requirements */}
                {job.work_requirements && Object.keys(job.work_requirements).length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">💼 Work Requirements</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {job.work_requirements.timezone && (
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">🌍</span>
                          <div>
                            <p className="font-medium text-gray-900">Timezone</p>
                            <p className="text-gray-600">{job.work_requirements.timezone}</p>
                          </div>
                        </div>
                      )}
                      {job.work_requirements.remote_policy && (
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">🏠</span>
                          <div>
                            <p className="font-medium text-gray-900">Remote Policy</p>
                            <p className="text-gray-600">{job.work_requirements.remote_policy}</p>
                          </div>
                        </div>
                      )}
                      {job.work_requirements.hours_per_week && (
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">⏰</span>
                          <div>
                            <p className="font-medium text-gray-900">Hours Per Week</p>
                            <p className="text-gray-600">{job.work_requirements.hours_per_week}</p>
                          </div>
                        </div>
                      )}
                      {job.work_requirements.visa_sponsorship !== undefined && (
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">🛂</span>
                          <div>
                            <p className="font-medium text-gray-900">Visa Sponsorship</p>
                            <p className="text-gray-600">{job.work_requirements.visa_sponsorship ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      )}
                      {job.work_requirements.travel_required && (
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">✈️</span>
                          <div>
                            <p className="font-medium text-gray-900">Travel Required</p>
                            <p className="text-gray-600">{job.work_requirements.travel_required}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Application Deliverables */}
                {job.application_deliverables && job.application_deliverables.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Application Deliverables</h3>
                    <div className="space-y-3">
                      {job.application_deliverables.map((del, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{del.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                del.required 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {del.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {[...Array(10)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1.5 h-3 rounded-sm ${
                                    i < del.weight ? 'bg-purple-500' : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {del.instructions && (
                            <p className="text-sm text-gray-600 mt-2">{del.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: Show old format if new taxonomy not available */}
                {(!job.responsibilities || job.responsibilities.length === 0) && 
                 (!job.required_qualifications || job.required_qualifications.length === 0) && (
                  <div className="space-y-6">
                    {job.required_skills && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {job.required_skills.split(',').map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.nice_to_have_skills && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Nice-to-Have Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {job.nice_to_have_skills.split(',').map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                            >
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.culture_requirements && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Culture & Values</h3>
                        <p className="text-gray-700">{job.culture_requirements}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Screening Questions Tab */}
            {activeTab === 'screening' && (
              <div>
                {job.screening_questions && job.screening_questions.length > 0 ? (
                  <div className="space-y-4">
                    {job.screening_questions.map((q, idx) => (
                      <div key={idx} className={`border-2 rounded-lg p-4 ${
                        q.deal_breaker ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {idx + 1}. {q.question}
                              </h4>
                              {q.deal_breaker && (
                                <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold">
                                  ⚠️ DEAL BREAKER
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {q.question_type && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                  {q.question_type}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                q.is_required 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {q.is_required ? 'Required' : 'Optional'}
                              </span>
                              {q.weight && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600">Weight:</span>
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(10)].map((_, i) => (
                                      <div 
                                        key={i} 
                                        className={`w-1.5 h-3 rounded-sm ${
                                          i < q.weight ? 'bg-orange-500' : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-bold text-gray-700">{q.weight}/10</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {q.ideal_answer && (
                          <div className="mt-3 pl-4 border-l-3 border-green-400 bg-green-50 py-2 rounded">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-green-800">✓ Ideal Answer:</span> {q.ideal_answer}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No screening questions defined for this position</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {job.extraction_status === 'extracted' ? (
            <Link
              href={`/jobs/${id}/matches`}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Candidate Matches
            </Link>
          ) : (
            <div className="relative group">
              <button
                disabled
                className="px-6 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
              >
                View Candidate Matches
              </button>
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap">
                Extract job requirements first
              </div>
            </div>
          )}
          <button
            onClick={() => router.push('/jobs')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Job
          </button>
        </div>
      </div>
    </div>
  )
}
