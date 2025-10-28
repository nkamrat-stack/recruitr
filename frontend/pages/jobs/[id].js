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

                {job.evaluation_levels && job.evaluation_levels.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Evaluation Pipeline</h3>
                    <div className="space-y-3">
                      {job.evaluation_levels.map((level, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">
                              Level {level.level_number}: {level.level_name}
                            </h4>
                            {level.advance_count && (
                              <span className="text-sm text-gray-600">
                                Advance: {level.advance_count === 'all' ? 'All' : level.advance_count}
                              </span>
                            )}
                          </div>
                          {level.required_deliverables && level.required_deliverables.length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-600 mb-1">Required:</p>
                              <div className="flex flex-wrap gap-1">
                                {level.required_deliverables.map((del, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                                    {del}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {level.optional_deliverables && level.optional_deliverables.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Optional:</p>
                              <div className="flex flex-wrap gap-1">
                                {level.optional_deliverables.map((del, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                    {del}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {idx + 1}. {q.question}
                          </h4>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            q.is_required 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {q.is_required ? 'Required' : 'Preferred'}
                          </span>
                        </div>
                        {q.ideal_answer && (
                          <div className="mt-2 pl-4 border-l-2 border-gray-300">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Ideal Answer:</span> {q.ideal_answer}
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
