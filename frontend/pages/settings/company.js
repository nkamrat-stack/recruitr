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
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [inputMode, setInputMode] = useState('manual')
  const [generationUrl, setGenerationUrl] = useState('')
  
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
      
      setSuccess('Company profile saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateFromWebsite = async () => {
    if (!generationUrl.trim()) {
      setError('Please enter a website URL')
      return
    }
    
    setError('AI website scraping feature coming soon. For now, please enter details manually.')
    setTimeout(() => setError(null), 4000)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Company Profile</h1>
          <p className="text-gray-600">
            Manage your company information and culture details
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                inputMode === 'manual'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setInputMode('generate')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                inputMode === 'generate'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Generate from Website
            </button>
          </div>

          <div className="p-6">
            {inputMode === 'manual' ? (
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
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.yourcompany.com"
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
                    onClick={() => router.push('/jobs')}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    AI-Powered Website Analysis
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Enter your company website URL and our AI will automatically extract and populate
                    your company information, mission, vision, values, and culture description.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={generationUrl}
                        onChange={(e) => setGenerationUrl(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://www.yourcompany.com"
                      />
                    </div>

                    <button
                      onClick={handleGenerateFromWebsite}
                      disabled={generating}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition-colors flex items-center justify-center"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Analyzing Website...
                        </>
                      ) : (
                        'Generate from Website'
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Note:</strong> After generating, you can switch to Manual Entry mode to review
                    and edit the AI-generated content before saving.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
