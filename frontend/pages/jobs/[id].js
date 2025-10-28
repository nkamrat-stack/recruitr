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
                {job.required_qualifications && job.required_qualifications.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Required Qualifications</h3>
                    <div className="space-y-3">
                      {job.required_qualifications.map((qual, idx) => (
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
                            </div>
                            <p className="text-gray-800">{qual.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preferred Qualifications */}
                {job.preferred_qualifications && job.preferred_qualifications.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">⭐ Preferred Qualifications</h3>
                    <div className="space-y-3">
                      {job.preferred_qualifications.map((qual, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {qual.weight || '?'}
                          </div>
                          <div className="flex-1">
                            <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded mb-1 inline-block">
                              {qual.type}
                            </span>
                            <p className="text-gray-800">{qual.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competencies */}
                {job.competencies && job.competencies.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Competencies & Soft Skills</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {job.competencies.map((comp, idx) => (
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
                          <p className="text-sm text-gray-600">{comp.description}</p>
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
          <Link
            href={`/jobs/${id}/matches`}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Candidate Matches
          </Link>
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
