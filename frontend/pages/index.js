import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-6">
          Welcome to Recruitr
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-powered candidate ranking and matching system
        </p>
        <p className="text-lg text-gray-500 mb-12">
          Upload candidate resumes and rank them against job descriptions using our intelligent matching algorithm
        </p>
        <Link 
          href="/candidates"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
        >
          Go to App
        </Link>
      </div>
    </div>
  )
}
