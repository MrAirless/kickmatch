import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Matches from './pages/Matches'
import AboSuccess from './pages/AboSuccess'
import Datenschutz from './pages/Datenschutz'
import Impressum from './pages/Impressum'
import Contact from './pages/Contact'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/preise" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/abo/success" element={<AboSuccess />} />
              <Route path="/kontakt" element={<Contact />} />
              <Route path="/datenschutz" element={<Datenschutz />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="/spiele" element={
                <ProtectedRoute><Matches /></ProtectedRoute>
              } />
              <Route path="/profil" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="*" element={
                <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                  <p className="text-4xl font-bold text-gray-900 mb-4">404</p>
                  <p className="text-gray-500 mb-6">Diese Seite gibt es nicht.</p>
                  <a href="/" className="btn-primary">Zur Startseite</a>
                </div>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
