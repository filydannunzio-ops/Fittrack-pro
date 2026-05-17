import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, getProfile } from './lib/supabase.js'
import Login from './pages/Login.jsx'
import AtletaDashboard from './pages/AtletaDashboard.jsx'
import TrainerDashboard from './pages/TrainerDashboard.jsx'
import WorkoutSession from './pages/WorkoutSession.jsx'
import './index.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) {
        const p = await getProfile(session.user.id)
        setProfile(p)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        const p = await getProfile(session.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">
        <span className="logo-icon">💪</span>
        <span>FitTrack Pro</span>
      </div>
    </div>
  )

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        {profile?.ruolo === 'trainer' ? (
          <>
            <Route path="/" element={<TrainerDashboard profile={profile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<AtletaDashboard profile={profile} />} />
            <Route path="/workout/:schedaId" element={<WorkoutSession profile={profile} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
