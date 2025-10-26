import { useState } from 'react'

const BACKEND_URL = 'http://localhost:8000'

export default function Candidates() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('email', email)
    formData.append('file', file)

    try {
      const response = await fetch(`${BACKEND_URL}/ingest/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()
      setResult(data)
      setName('')
      setEmail('')
      setFile(null)
      e.target.reset()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Upload Candidate Resume</h1>
      
      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Candidate Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume File
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              required
              accept=".txt,.pdf,.doc,.docx"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Accepted formats: .txt, .pdf, .doc, .docx
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Uploading...' : 'Upload Candidate'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800 font-medium">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-800 mb-4">Upload Successful!</h2>
          <div className="space-y-3">
            <p className="text-gray-700">
              <span className="font-semibold">Name:</span> {result.name}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {result.email}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">ID:</span> {result.id}
            </p>
            {result.skills_detected && result.skills_detected.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Skills Detected:</p>
                <div className="flex flex-wrap gap-2">
                  {result.skills_detected.map((skill, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {result.culture_signals && result.culture_signals.length > 0 && (
              <div>
                <p className="font-semibold text-gray-700 mb-2">Culture Signals:</p>
                <div className="flex flex-wrap gap-2">
                  {result.culture_signals.map((signal, idx) => (
                    <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
