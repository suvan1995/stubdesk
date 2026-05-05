import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="text-6xl font-extrabold text-brand-200">404</div>
      <h1 className="text-2xl font-bold text-gray-700">Page not found</h1>
      <p className="text-gray-400 text-sm">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">Go to Dashboard</Link>
    </div>
  )
}
