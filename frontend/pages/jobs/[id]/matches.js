import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function JobMatches() {
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
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)
  const [error, setError] = useState(null)
  const [showOnlyCompatible, setShowOnlyCompatible] = useState(false)
  const [scoreThreshold, setScoreThreshold] = useState(0)
  const [expandedReasoning, setExpandedReasoning] = useState({})

  useEffect(() => {
    if (id) {
      fetchJobAndMatches()
    }
  }, [id])

  const fetchJobAndMatches = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const jobResponse = await fetch(`${BACKEND_URL}/jobs/${id}`)
      if (!jobResponse.ok) throw new Error('Failed to fetch job details')
      const jobData = await jobResponse.json()
      setJob(jobData)
      
      setMatching(true)
      const matchResponse = await fetch(`${BACKEND_URL}/jobs/${id}/match`, {
        method: 'POST',
      })
      if (!matchResponse.ok) throw new Error('Failed to generate matches')
      const matchData = await matchResponse.json()
      setMatches(matchData)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setMatching(false)
    }
  }

  const toggleReasoning = (matchId) => {
    setExpandedReasoning(prev => ({
      ...prev,
      [matchId]: !prev[matchId]
    }))
  }

  const filteredMatches = matches.filter(match => {
    if (showOnlyCompatible) {
      const isFullyCompatible = 
        match.salary_compatible &&
        match.hours_compatible &&
        match.location_compatible &&
        match.visa_compatible &&
        match.availability_compatible
      if (!isFullyCompatible) return false
    }
    
    if (match.overall_score < scoreThreshold) return false
    
    return true
  })

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-xl font-semibold mb-4">Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => router.push('/jobs')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/jobs')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
            >
              ← Back to Jobs
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Candidate Matches</h1>
            {job && (
              <p className="text-gray-600 mt-2">
                {job.title} · {matches.length} candidates matched
              </p>
            )}
          </div>
          <button
            onClick={fetchJobAndMatches}
            disabled={matching}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {matching ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Matching...
              </>
            ) : (
              'Refresh Matches'
            )}
          </button>
        </div>

        {job && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-semibold">{job.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Salary Range</p>
                <p className="font-semibold">
                  {job.salary_min && job.salary_max
                    ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                    : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="compatibleOnly"
                checked={showOnlyCompatible}
                onChange={(e) => setShowOnlyCompatible(e.target.checked)}
                className="mr-2 h-5 w-5 text-blue-600"
              />
              <label htmlFor="compatibleOnly" className="text-gray-700 font-medium">
                Show only fully compatible candidates
              </label>
            </div>
            
            <div className="flex-1">
              <label htmlFor="scoreThreshold" className="text-gray-700 font-medium block mb-2">
                Minimum Score: {scoreThreshold}
              </label>
              <input
                type="range"
                id="scoreThreshold"
                min="0"
                max="100"
                step="5"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredMatches.length} of {matches.length} candidates
          </div>
        </div>

        {matching && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-800 font-semibold">Analyzing candidates with AI...</p>
            <p className="text-blue-600 text-sm mt-2">This may take a moment</p>
          </div>
        )}

        {!matching && filteredMatches.length === 0 && matches.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-semibold">No candidates match your filters</p>
            <p className="text-yellow-600 text-sm mt-2">Try adjusting the filters above</p>
          </div>
        )}

        {!matching && matches.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-800 font-semibold">No candidates found</p>
            <p className="text-gray-600 text-sm mt-2">
              Make sure candidates have AI profiles generated before matching
            </p>
          </div>
        )}

        <div className="space-y-6">
          {filteredMatches.map((match, index) => (
            <div
              key={match.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    #{index + 1}
                  </div>
                  <div>
                    <Link
                      href={`/candidates/${match.candidate_id}`}
                      className="text-xl font-bold text-blue-600 hover:text-blue-800"
                    >
                      {match.candidate_name}
                    </Link>
                    <p className="text-sm text-gray-500">Candidate ID: {match.candidate_id}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Overall Score</div>
                  <div className={`text-4xl font-bold ${getScoreColor(match.overall_score)}`}>
                    {Math.round(match.overall_score)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Match</span>
                  <span className={`text-sm font-semibold ${getScoreColor(match.overall_score)}`}>
                    {Math.round(match.overall_score)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      match.overall_score >= 80 ? 'bg-green-500' :
                      match.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${match.overall_score}%` }}
                  ></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className={`p-3 rounded-lg ${getScoreBgColor(match.skills_score)}`}>
                  <div className="text-xs text-gray-600 mb-1">Skills</div>
                  <div className={`text-2xl font-bold ${getScoreColor(match.skills_score)}`}>
                    {Math.round(match.skills_score)}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBgColor(match.culture_score)}`}>
                  <div className="text-xs text-gray-600 mb-1">Culture</div>
                  <div className={`text-2xl font-bold ${getScoreColor(match.culture_score)}`}>
                    {Math.round(match.culture_score)}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBgColor(match.communication_score)}`}>
                  <div className="text-xs text-gray-600 mb-1">Communication</div>
                  <div className={`text-2xl font-bold ${getScoreColor(match.communication_score)}`}>
                    {Math.round(match.communication_score)}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBgColor(match.quality_score)}`}>
                  <div className="text-xs text-gray-600 mb-1">Quality</div>
                  <div className={`text-2xl font-bold ${getScoreColor(match.quality_score)}`}>
                    {Math.round(match.quality_score)}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${getScoreBgColor(match.potential_score)}`}>
                  <div className="text-xs text-gray-600 mb-1">Potential</div>
                  <div className={`text-2xl font-bold ${getScoreColor(match.potential_score)}`}>
                    {Math.round(match.potential_score)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">Compatibility Check</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    match.salary_compatible ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-lg">
                      {match.salary_compatible ? '✅' : '❌'}
                    </span>
                    <span className={`text-sm font-medium ${
                      match.salary_compatible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Salary
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    match.hours_compatible ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-lg">
                      {match.hours_compatible ? '✅' : '❌'}
                    </span>
                    <span className={`text-sm font-medium ${
                      match.hours_compatible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Hours
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    match.location_compatible ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-lg">
                      {match.location_compatible ? '✅' : '❌'}
                    </span>
                    <span className={`text-sm font-medium ${
                      match.location_compatible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Location
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    match.visa_compatible ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-lg">
                      {match.visa_compatible ? '✅' : '❌'}
                    </span>
                    <span className={`text-sm font-medium ${
                      match.visa_compatible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Visa
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-2 p-2 rounded ${
                    match.availability_compatible ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <span className="text-lg">
                      {match.availability_compatible ? '✅' : '❌'}
                    </span>
                    <span className={`text-sm font-medium ${
                      match.availability_compatible ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {match.ai_reasoning && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => toggleReasoning(match.id)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-2"
                  >
                    <span className={`transform transition-transform ${
                      expandedReasoning[match.id] ? 'rotate-90' : ''
                    }`}>
                      ▶
                    </span>
                    AI Reasoning
                  </button>
                  
                  {expandedReasoning[match.id] && (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                      {match.ai_reasoning}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex justify-end">
                <Link
                  href={`/candidates/${match.candidate_id}`}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  View Full Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
