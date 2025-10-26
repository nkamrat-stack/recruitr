import { useState } from 'react'

const getBackendURL = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    return `https://${hostname.replace('-5000.', '-8000.')}`
  }
  return ''
}

export default function Jobs() {
  const BACKEND_URL = getBackendURL()
  const [jobTitle, setJobTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch(`${BACKEND_URL}/match/rank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `${jobTitle}\n\n${description}`,
          required_skills: []
        }),
      })

      if (!response.ok) {
        throw new Error('Ranking failed')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Rank Candidates</h1>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Senior Backend Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the job description, requirements, and skills needed..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Ranking...' : 'Rank Candidates'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No candidates found. Please upload some candidates first!</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Ranking Results ({results.length} candidates)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matched Skills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Missing Skills
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((candidate, index) => (
                  <tr key={candidate.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{candidate.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-bold text-gray-900 mr-2">
                          {(candidate.overall_score * 100).toFixed(1)}%
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${candidate.overall_score * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Skills: {(candidate.skills_score * 100).toFixed(0)}% | 
                        Culture: {(candidate.culture_score * 100).toFixed(0)}% | 
                        Potential: {(candidate.potential_score * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.matched_skills.length > 0 ? (
                          candidate.matched_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.missing_skills.length > 0 ? (
                          candidate.missing_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
