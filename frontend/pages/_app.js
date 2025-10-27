import '../styles/globals.css'
import Link from 'next/link'

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen">
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link href="/" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                <span className="font-bold text-xl">Recruitr</span>
              </Link>
              <Link href="/candidates" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                Candidates
              </Link>
              <Link href="/settings/company" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                Company
              </Link>
              <Link href="/jobs" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                Jobs
              </Link>
              <Link href="/candidates/upload" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                Upload Resume
              </Link>
              <Link href="/rank-candidates" className="flex items-center px-3 py-2 hover:bg-blue-700 rounded-md transition">
                Rank Candidates
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main>
        <Component {...pageProps} />
      </main>
    </div>
  )
}
