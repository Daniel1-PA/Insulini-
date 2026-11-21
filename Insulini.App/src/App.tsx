import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { type Preferences } from './components/Shared'
import { AuthScreen } from './features/auth/AuthScreen'
import { CaregiverApp } from './features/caregiver/CaregiverApp'
import { DoctorApp } from './features/doctor/DoctorApp'
import { PatientApp } from './features/patient/PatientApp'
import { api, saveSession, storedSession, type Session } from './lib/api'

const defaultPreferences: Preferences = { fontScale: 100, highContrast: false, readAloud: false, simpleMode: false, strongVibration: true, voiceDictation: true }

function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)

  const updatePreferences = useCallback((value: Preferences) => setPreferences(value), [])

  useEffect(() => {
    if (!session) return
    api<Preferences>('/profile/accessibility', {}, session).then(setPreferences).catch(() => setPreferences(defaultPreferences))
  }, [session])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(preferences.fontScale / 100))
    document.documentElement.classList.toggle('high-contrast', preferences.highContrast)
    document.documentElement.classList.toggle('simple-mode', preferences.simpleMode)
  }, [preferences])

  function authenticate(value: Session) { saveSession(value); setSession(value) }
  function logout() { saveSession(null); setSession(null); setPreferences(defaultPreferences) }

  if (!session) return <AuthScreen onAuthenticated={authenticate} />
  if (session.role === 'Patient') return <PatientApp session={session} preferences={preferences} onPreferences={updatePreferences} onLogout={logout} />
  if (session.role === 'Caregiver') return <CaregiverApp session={session} onPreferences={updatePreferences} onLogout={logout} />
  return <DoctorApp session={session} onPreferences={updatePreferences} onLogout={logout} />
}

export default App
