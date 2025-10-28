import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CompanyProfile() {
  const getBackendURL = () => {
    if (typeof window === 'undefined') return ''
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    return `${protocol}//${hostname}:8000`
  }
  
  const BACKEND_URL = getBackendURL()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [viewMode, setViewMode] = useState(false)
  
  const [formData, setFormData] = useState({
    company_name: '',
    about_company: '',
    mission: '',
    vision: '',
    values: '',
    culture_description: '',
    website_url: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${BACKEND_URL}/company/profile`)
      if (response.status === 404) {
        setViewMode(false)
        setLoading(false)
        return
      }
      if (!response.ok) throw new Error('Failed to fetch company profile')
      
      const data = await response.json()
      setFormData({
        company_name: data.company_name || '',
        about_company: data.about_company || '',
        mission: data.mission || '',
        vision: data.vision || '',
        values: data.values || '',
        culture_description: data.culture_description || '',
        website_url: data.website_url || '',
      })
      setViewMode(true)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.company_name.trim()) {
      setError('Company name is required')
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const response = await fetch(`${BACKEND_URL}/company/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to save company profile')
      }

      const data = await response.json()
      setFormData({
        company_name: data.company_name || '',
        about_company: data.about_company || '',
        mission: data.mission || '',
        vision: data.vision || '',
        values: data.values || '',
        culture_description: data.culture_description || '',
        website_url: data.website_url || '',
      })
      
      setViewMode(true)
      setSuccess('✓ Company profile saved successfully!')
      setTimeout(() => setSuccess(null), 5000)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEdit = () => {
    setViewMode(false)
    setSuccess(null)
    setError(null)
  }

  const handleCancel = () => {
    if (formData.company_name) {
      setViewMode(true)
      fetchProfile()
    } else {
      router.push('/jobs')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading company profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Company Profile</h1>
            <p className="text-gray-600">
              {viewMode ? 'View your company information and culture details' : 'Manage your company information and culture details'}
            </p>
          </div>
          {viewMode && (
            <button
              onClick={handleEdit}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-6 py-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center">
              <span className="text-xl mr-3">✓</span>
              <span className="font-semibold">{success}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md">
          <div className="p-8">
            {viewMode ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Company Name
                  </h2>
                  <p className="text-2xl font-bold text-gray-900">
                    {formData.company_name || 'Not provided'}
                  </p>
                </div>

                {formData.about_company && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      About the Company
                    </h2>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formData.about_company}
                    </p>
                  </div>
                )}

                {formData.mission && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Mission Statement
                    </h2>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formData.mission}
                    </p>
                  </div>
                )}

                {formData.vision && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Vision Statement
                    </h2>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formData.vision}
                    </p>
                  </div>
                )}

                {formData.values && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Core Values
                    </h2>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formData.values}
                    </p>
                  </div>
                )}

                {formData.culture_description && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Culture Description
                    </h2>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {formData.culture_description}
                    </p>
                  </div>
                )}

                {formData.website_url && (
                  <div>
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Website URL
                    </h2>
                    <a
                      href={formData.website_url.startsWith('http') ? formData.website_url : `https://${formData.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-lg"
                    >
                      {formData.website_url}
                    </a>
                  </div>
                )}

                {!formData.about_company && !formData.mission && !formData.vision && !formData.values && !formData.culture_description && !formData.website_url && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No additional company information provided.</p>
                    <p className="mt-2">Click "Edit Profile" above to add more details.</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    About the Company
                  </label>
                  <textarea
                    name="about_company"
                    value={formData.about_company}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your company, what you do, and your history"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mission Statement
                  </label>
                  <textarea
                    name="mission"
                    value={formData.mission}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What is your company's mission?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vision Statement
                  </label>
                  <textarea
                    name="vision"
                    value={formData.vision}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What is your company's vision for the future?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Core Values
                  </label>
                  <textarea
                    name="values"
                    value={formData.values}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="List your company's core values"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Culture Description
                  </label>
                  <textarea
                    name="culture_description"
                    value={formData.culture_description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your company culture, work environment, and team dynamics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Website URL
                  </label>
                  <input
                    type="text"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="www.yourcompany.com or https://www.yourcompany.com"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Company Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
