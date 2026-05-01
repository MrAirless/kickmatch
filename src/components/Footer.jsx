import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16 py-8 bg-white">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <p>© {new Date().getFullYear()} KickMatch</p>
        <div className="flex gap-6">
          <Link to="/datenschutz" className="hover:text-gray-600 transition-colors">Datenschutz</Link>
          <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
        </div>
      </div>
    </footer>
  )
}
