import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'

const getBackendURL = () => {
  if (typeof window === 'undefined') return ''
  const protocol = window.location.protocol
  const hostname = window.location.hostname
  return `${protocol}//${hostname}:8000`
}

const BACKEND_URL = getBackendURL()

export default function CandidatesList() {
  const router = useRouter()
  const [candidates, setCandidates] = useState([])
  const [profiles, setProfiles] = useState({})
  const [applications, setApplications] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Filter states
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [aiStatusFilter, setAiStatusFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState('all')
  
  // Bulk generation state
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })
  
  // Sorting state
  const [sortBy, setSortBy] = useState('score')
  const [sortOrder, setSortOrder] = useState('desc')
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    salary_expectation_min: '',
    salary_expectation_max: '',
    hours_available: 40,
    visa_status: '',
  })

  useEffect(() => {
    fetchCandidates()
  }, [])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/candidates/`)
      if (!response.ok) throw new Error('Failed to fetch candidates')
      const data = await response.json()
      setCandidates(data)
      
      // Fetch profiles and applications for all candidates in parallel
      await Promise.all([
        fetchAllProfiles(data),
        fetchAllApplications(data)
      ])
      
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProfiles = async (candidateList) => {
    const profilesData = {}
    
    // Fetch profiles in parallel for better performance
    await Promise.all(
      candidateList.map(async (candidate) => {
        try {
          const response = await fetch(`${BACKEND_URL}/candidates/${candidate.id}/profile`)
          if (response.ok) {
            const profile = await response.json()
            profilesData[candidate.id] = profile
          }
        } catch (err) {
          // Profile doesn't exist, that's ok
        }
      })
    )
    
    setProfiles(profilesData)
  }

  const fetchAllApplications = async (candidateList) => {
    const applicationsData = {}
    
    // Fetch applications in parallel
    await Promise.all(
      candidateList.map(async (candidate) => {
        try {
          const response = await fetch(`${BACKEND_URL}/candidates/${candidate.id}/applications`)
          if (response.ok) {
            const apps = await response.json()
            applicationsData[candidate.id] = apps
          }
        } catch (err) {
          // No applications, that's ok
        }
      })
    )
    
    setApplications(applicationsData)
  }

  const getAIStatus = (candidate) => {
    const profile = profiles[candidate.id]
    
    if (!profile) {
      return 'not_analyzed'
    }
    
    // Check if any artifacts were uploaded after the profile was generated
    if (candidate.latest_artifact_uploaded_at && profile.last_ai_analysis) {
      const lastArtifactDate = new Date(candidate.latest_artifact_uploaded_at)
      const profileDate = new Date(profile.last_ai_analysis)
      
      if (lastArtifactDate > profileDate) {
        return 'needs_update'
      }
    }
    
    return 'current'
  }

  const handleGenerateProfile = async (candidateId, skipRefresh = false) => {
    try {
      const response = await fetch(`${BACKEND_URL}/candidates/${candidateId}/generate-profile`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate profile')
      }
      
      const profile = await response.json()
      
      // Update profiles state
      setProfiles(prev => ({
        ...prev,
        [candidateId]: profile
      }))
      
      // Only refresh if not in bulk operation
      if (!skipRefresh) {
        await fetchCandidates()
      }
      
      return profile
      
    } catch (err) {
      if (!skipRefresh) {
        alert(`Error generating profile: ${err.message}`)
      }
      throw err
    }
  }

  const handleBulkGenerateProfiles = async () => {
    const candidatesWithoutProfiles = candidates.filter(c => !profiles[c.id])
    
    if (candidatesWithoutProfiles.length === 0) {
      alert('All candidates already have profiles!')
      return
    }
    
    if (!confirm(`Generate profiles for ${candidatesWithoutProfiles.length} candidates? This may take a few minutes.`)) {
      return
    }
    
    setBulkGenerating(true)
    setBulkProgress({ current: 0, total: candidatesWithoutProfiles.length })
    
    let successCount = 0
    let errorCount = 0
    
    // Generate profiles without refreshing after each one
    for (let i = 0; i < candidatesWithoutProfiles.length; i++) {
      const candidate = candidatesWithoutProfiles[i]
      setBulkProgress({ current: i + 1, total: candidatesWithoutProfiles.length })
      
      try {
        await handleGenerateProfile(candidate.id, true) // skipRefresh = true
        successCount++
      } catch (err) {
        console.error(`Failed to generate profile for ${candidate.name}:`, err)
        errorCount++
      }
    }
    
    // Refresh once at the end
    await fetchCandidates()
    
    setBulkGenerating(false)
    setBulkProgress({ current: 0, total: 0 })
    
    // Show summary
    if (errorCount > 0) {
      alert(`Generated ${successCount} profiles successfully. ${errorCount} failed.`)
    } else {
      alert(`Successfully generated ${successCount} profiles!`)
    }
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = candidates.length
    const newCount = candidates.filter(c => c.status === 'new').length
    const inReview = candidates.filter(c => ['reviewing', 'interviewed', 'finalist'].includes(c.status)).length
    const withMaterials = candidates.filter(c => c.artifact_count > 0).length
    
    return { total, newCount, inReview, withMaterials }
  }, [candidates])

  // Get unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = candidates
      .map(c => c.location)
      .filter(loc => loc && loc.trim() !== '')
    return [...new Set(locations)].sort()
  }, [candidates])

  // Enrich candidates with AI data and filter
  const enrichedAndFilteredCandidates = useMemo(() => {
    return candidates
      .map(candidate => ({
        ...candidate,
        aiStatus: getAIStatus(candidate),
        score: profiles[candidate.id]?.overall_score || null
      }))
      .filter(candidate => {
        // Search filter
        const matchesSearch = searchText === '' || 
          candidate.name.toLowerCase().includes(searchText.toLowerCase()) ||
          candidate.email.toLowerCase().includes(searchText.toLowerCase())
        
        // Status filter
        const matchesStatus = statusFilter === 'all' || candidate.status === statusFilter
        
        // Location filter
        const matchesLocation = locationFilter === 'all' || candidate.location === locationFilter
        
        // AI Status filter
        const matchesAIStatus = aiStatusFilter === 'all' || candidate.aiStatus === aiStatusFilter
        
        // Score filter
        let matchesScore = true
        if (scoreFilter !== 'all') {
          if (!candidate.score) {
            matchesScore = false
          } else if (scoreFilter === '90+') {
            matchesScore = candidate.score >= 0.9
          } else if (scoreFilter === '80-89') {
            matchesScore = candidate.score >= 0.8 && candidate.score < 0.9
          } else if (scoreFilter === '70-79') {
            matchesScore = candidate.score >= 0.7 && candidate.score < 0.8
          } else if (scoreFilter === 'below70') {
            matchesScore = candidate.score < 0.7
          }
        }
        
        return matchesSearch && matchesStatus && matchesLocation && matchesAIStatus && matchesScore
      })
      .sort((a, b) => {
        // Sort by score
        if (sortBy === 'score') {
          if (a.score === null && b.score === null) return 0
          if (a.score === null) return 1
          if (b.score === null) return -1
          
          return sortOrder === 'desc' ? b.score - a.score : a.score - b.score
        }
        
        return 0
      })
  }, [candidates, profiles, searchText, statusFilter, locationFilter, aiStatusFilter, scoreFilter, sortBy, sortOrder])

  const handleCreateCandidate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        salary_expectation_min: formData.salary_expectation_min ? parseInt(formData.salary_expectation_min) : null,
        salary_expectation_max: formData.salary_expectation_max ? parseInt(formData.salary_expectation_max) : null,
        hours_available: parseInt(formData.hours_available),
      }

      const response = await fetch(`${BACKEND_URL}/candidates/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create candidate')
      }

      setShowAddModal(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        location: '',
        salary_expectation_min: '',
        salary_expectation_max: '',
        hours_available: 40,
        visa_status: '',
      })
      fetchCandidates()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  const clearFilters = () => {
    setSearchText('')
    setStatusFilter('all')
    setLocationFilter('all')
    setAiStatusFilter('all')
    setScoreFilter('all')
  }

  const getStatusBadgeColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      interviewed: 'bg-purple-100 text-purple-800',
      offered: 'bg-green-100 text-green-800',
      hired: 'bg-green-600 text-white',
      rejected: 'bg-red-100 text-red-800',
      deleted: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getAIStatusBadge = (aiStatus) => {
    const badges = {
      current: { icon: '✅', text: 'Current', color: 'bg-green-100 text-green-800' },
      needs_update: { icon: '⚠️', text: 'Needs Update', color: 'bg-yellow-100 text-yellow-800' },
      not_analyzed: { icon: '❌', text: 'Not Analyzed', color: 'bg-gray-100 text-gray-800' },
    }
    return badges[aiStatus] || badges.not_analyzed
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading candidates...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Candidates</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchCandidates}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const candidatesWithoutProfiles = candidates.filter(c => !profiles[c.id])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600 mt-2">{candidates.length} total candidates</p>
        </div>
        <div className="flex gap-3">
          {candidatesWithoutProfiles.length > 0 && (
            <button
              onClick={handleBulkGenerateProfiles}
              disabled={bulkGenerating}
              className="bg-purple-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-purple-700 transition disabled:bg-gray-400"
            >
              {bulkGenerating 
                ? `Generating ${bulkProgress.current}/${bulkProgress.total}...`
                : `🤖 Generate All Profiles (${candidatesWithoutProfiles.length})`
              }
            </button>
          )}
          <button
            onClick={() => router.push('/candidates/upload')}
            className="bg-green-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-green-700 transition"
          >
            Upload Resume
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            + Add New Candidate
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-semibold uppercase">Total Candidates</p>
              <p className="text-4xl font-bold mt-2">{metrics.total}</p>
            </div>
            <div className="text-5xl opacity-20">👥</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-semibold uppercase">New Candidates</p>
              <p className="text-4xl font-bold mt-2">{metrics.newCount}</p>
            </div>
            <div className="text-5xl opacity-20">✨</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-semibold uppercase">In Review</p>
              <p className="text-4xl font-bold mt-2">{metrics.inReview}</p>
            </div>
            <div className="text-5xl opacity-20">📋</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-semibold uppercase">With Materials</p>
              <p className="text-4xl font-bold mt-2">{metrics.withMaterials}</p>
            </div>
            <div className="text-5xl opacity-20">📄</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="interviewed">Interviewed</option>
              <option value="finalist">Finalist</option>
              <option value="offered">Offered</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Status
            </label>
            <select
              value={aiStatusFilter}
              onChange={(e) => setAiStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="not_analyzed">Not Analyzed</option>
              <option value="current">Current</option>
              <option value="needs_update">Needs Update</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Score Range
            </label>
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Scores</option>
              <option value="90+">90+</option>
              <option value="80-89">80-89</option>
              <option value="70-79">70-79</option>
              <option value="below70">Below 70</option>
            </select>
          </div>
        </div>

        {/* Second row for Location */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchText || statusFilter !== 'all' || locationFilter !== 'all' || aiStatusFilter !== 'all' || scoreFilter !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {enrichedAndFilteredCandidates.length} of {candidates.length} candidates
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">No candidates yet</h3>
          <p className="mt-2 text-gray-600">Get started by adding your first candidate.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            Add First Candidate
          </button>
        </div>
      ) : enrichedAndFilteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-gray-900">No candidates match your filters</h3>
          <p className="mt-2 text-gray-600">Try adjusting your search or filters.</p>
          <button
            onClick={clearFilters}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Materials
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Jobs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Status
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  Score {sortOrder === 'desc' ? '↓' : '↑'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrichedAndFilteredCandidates.map((candidate) => {
                const aiStatusBadge = getAIStatusBadge(candidate.aiStatus)
                const profile = profiles[candidate.id]
                
                return (
                  <tr key={candidate.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/candidates/${candidate.id}`)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {candidate.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {candidate.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {candidate.artifact_count > 0 ? (
                        <span className="font-medium">{candidate.artifact_count} items</span>
                      ) : (
                        <span className="text-gray-400">0 items</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {applications[candidate.id] && applications[candidate.id].length > 0 ? (
                          applications[candidate.id].map((app) => (
                            <button
                              key={app.id}
                              onClick={() => router.push(`/jobs/${app.job_id}`)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition"
                              title={`Applied ${new Date(app.applied_at).toLocaleDateString()}`}
                            >
                              {app.job_title || `Job ${app.job_id}`}
                            </button>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">Not applied</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${aiStatusBadge.color}`}>
                        <span>{aiStatusBadge.icon}</span>
                        {aiStatusBadge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {candidate.score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {Math.round(candidate.score * 100)}/100
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${candidate.score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {!profile && (
                          <button
                            onClick={() => handleGenerateProfile(candidate.id)}
                            className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 transition text-xs font-semibold"
                          >
                            ▶️ Generate
                          </button>
                        )}
                        {profile && candidate.aiStatus === 'needs_update' && (
                          <button
                            onClick={() => handleGenerateProfile(candidate.id)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 transition text-xs font-semibold"
                          >
                            🔄 Update
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/candidates/${candidate.id}`)}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition text-xs font-semibold"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add New Candidate</h2>
            </div>
            <form onSubmit={handleCreateCandidate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Salary ($/hr)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_expectation_min}
                    onChange={(e) => setFormData({ ...formData, salary_expectation_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Salary ($/hr)
                  </label>
                  <input
                    type="number"
                    value={formData.salary_expectation_max}
                    onChange={(e) => setFormData({ ...formData, salary_expectation_max: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Available
                  </label>
                  <input
                    type="number"
                    value={formData.hours_available}
                    onChange={(e) => setFormData({ ...formData, hours_available: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visa Status
                  </label>
                  <select
                    value={formData.visa_status}
                    onChange={(e) => setFormData({ ...formData, visa_status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="citizen">Citizen</option>
                    <option value="green_card">Green Card</option>
                    <option value="h1b">H1B</option>
                    <option value="opt">OPT</option>
                    <option value="requires_sponsorship">Requires Sponsorship</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
