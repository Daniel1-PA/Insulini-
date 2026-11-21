import { useEffect, useState } from 'react'
import { api, type Session } from '../lib/api'
import { Icon } from './Icon'

export type Preferences = {
  fontScale: number
  highContrast: boolean
  readAloud: boolean
  simpleMode: boolean
  strongVibration: boolean
  voiceDictation: boolean
}

export function Loading() {
  return <div className="loading" role="status"><span /> Cargando tu información…</div>
}

export function Empty({ title, children }: { title: string, children: React.ReactNode }) {
  return <div className="empty"><span className="soft-icon"><Icon name="heart" /></span><h3>{title}</h3><p>{children}</p></div>
}

export function Progress({ value, label }: { value: number, label?: string }) {
  return <div className="progress-wrap">{label && <div className="progress-label"><span>{label}</span><strong>{value}%</strong></div>}<div className="progress"><span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div></div>
}

export function StatusMessage({ message, error = false }: { message: string, error?: boolean }) {
  return message ? <div className={`status-message ${error ? 'error' : ''}`} role="status">{message}</div> : null
}

export function AccessibilityPreferences({ session, onChange }: { session: Session, onChange: (preferences: Preferences) => void }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api<Preferences>('/profile/accessibility', {}, session).then(value => {
      setPreferences(value)
      onChange(value)
    }).catch(error => setMessage(error.message))
  }, [session, onChange])

  if (!preferences) return <Loading />

  async function update(next: Preferences) {
    setPreferences(next)
    onChange(next)
    try {
      const saved = await api<Preferences>('/profile/accessibility', { method: 'PUT', body: JSON.stringify(next) }, session)
      setPreferences(saved)
      setMessage('Preferencias guardadas')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible guardar.')
    }
  }

  const toggles: [keyof Preferences, string, string][] = [
    ['highContrast', 'Alto contraste', 'Colores más marcados'],
    ['readAloud', 'Leer en voz alta', 'Lee recordatorios y pantallas'],
    ['simpleMode', 'Modo simple', 'Menos opciones, botones grandes'],
    ['strongVibration', 'Vibración fuerte', 'En recordatorios compatibles'],
    ['voiceDictation', 'Dictado por voz', 'Para registrar síntomas'],
  ]

  return <section className="stack accessibility-panel">
    <div className="card setting-row font-setting">
      <div><strong>Tamaño de letra</strong><small>Vista previa: Hora de tu medicamento.</small></div>
      <div className="range-line"><span>A</span><input aria-label="Tamaño de letra" type="range" min="85" max="140" step="5" value={preferences.fontScale} onChange={event => update({ ...preferences, fontScale: Number(event.target.value) })} /><b>A</b><em>{preferences.fontScale}%</em></div>
    </div>
    <div className="card settings-list">
      {toggles.map(([key, label, hint]) => <label className="setting-row" key={key}>
        <span className={`soft-icon ${key}`}><Icon name={key === 'highContrast' ? 'eye' : key === 'voiceDictation' ? 'message' : 'settings'} /></span>
        <span><strong>{label}</strong><small>{hint}</small></span>
        <input className="switch" type="checkbox" checked={Boolean(preferences[key])} onChange={event => update({ ...preferences, [key]: event.target.checked })} />
      </label>)}
    </div>
    <StatusMessage message={message} error={message.includes('posible')} />
  </section>
}

export function Sparkline({ values, target }: { values: number[], target?: [number, number] }) {
  if (values.length < 2) return null
  const min = Math.min(...values, target?.[0] ?? Infinity) - 8
  const max = Math.max(...values, target?.[1] ?? -Infinity) + 8
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - ((value - min) / (max - min)) * 100}`).join(' ')
  const targetTop = target ? 100 - ((target[1] - min) / (max - min)) * 100 : 0
  const targetHeight = target ? ((target[1] - target[0]) / (max - min)) * 100 : 0
  return <svg className="sparkline" role="img" aria-label="Evolución de glucosa" viewBox="0 0 100 100" preserveAspectRatio="none">
    {target && <rect x="0" y={targetTop} width="100" height={targetHeight} className="chart-range" />}
    <polyline points={points} vectorEffect="non-scaling-stroke" />
  </svg>
}
