import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { subscribeUserToPush } from './lib/pushSubscription'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Matches = lazy(() => import('./pages/Matches'))
const GameDetail = lazy(() => import('./pages/GameDetail'))
const AboSuccess = lazy(() => import('./pages/AboSuccess'))
const Datenschutz = lazy(() => import('./pages/Datenschutz'))
const Impressum = lazy(() => import('./pages/Impressum'))
const Contact = lazy(() => import('./pages/Contact'))
const Einladung = lazy(() => import('./pages/Einladung'))
const Vereinsportal = lazy(() => import('./pages/Vereinsportal'))
const Admin = lazy(() => import('./pages/Admin'))

function PushSubscriber() {
  const { user } = useAuth()
  useEffect(() => {
    if (user?.email) subscribeUserToPush(user.email)
  }, [user?.email])
  return null
}

function PageLoader() {
  return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <PushSubscriber />
          <Navbar />
          <main className="flex-1">
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/spiele/:id" element={
                  <ProtectedRoute><GameDetail /></ProtectedRoute>
                } />
                <Route path="/profil" element={
                  <ProtectedRoute><Profile /></ProtectedRoute>
                } />
                <Route path="/einladung/:token" element={<Einladung />} />
                <Route path="/vereinsportal" element={
                  <ProtectedRoute><Vereinsportal /></ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute><Admin /></ProtectedRoute>
                } />
                <Route path="*" element={
                  <div className="max-w-2xl mx-auto px-4 py-20 text-center">
                    <p className="text-4xl font-bold text-gray-900 mb-4">404</p>
                    <p className="text-gray-500 mb-6">Diese Seite gibt es nicht.</p>
                    <a href="/" className="btn-primary">Zur Startseite</a>
                  </div>
                } />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
