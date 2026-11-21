import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Icon, Logo } from '../../components/Icon'
import { AccessibilityPreferences, Empty, Loading, Progress, Sparkline, type Preferences } from '../../components/Shared'
import { api, type Session } from '../../lib/api'

type DoseTime = { time: string, status: string }
type Medication = { id: string, name: string, dose: string, frequency: string, instructions: string, times: DoseTime[] }
type Dashboard = {
  user: { id: string, name: string }
  glucose: null | { value: number, unit: string, measuredAt: string, glucoseTargetMin: number, glucoseTargetMax: number, series: { measuredAt: string, value: number }[] }
  treatment: { adherence: number, completedToday: number, totalToday: number, doctorInstructions: string, medications: Medication[] }
  activities: { id: string, type: string, durationMinutes: number, intensity: string, occurredAt: string }[]
  symptoms: { id: string, name: string, severity: number, notes?: string, occurredAt: string }[]
  nextAppointment?: { title: string, startsAt: string, modality: string, doctor?: { fullName: string } }
  indicators?: { weight?: { value: number, unit: string }, heartRate?: { value: number, unit: string }, hba1c?: { value: number, unit: string } }
}

type View = 'home' | 'treatment' | 'health' | 'activity' | 'symptoms' | 'notifications' | 'profile'

export function PatientApp({ session, preferences, onPreferences, onLogout }: { session: Session, preferences: Preferences, onPreferences: (value: Preferences) => void, onLogout: () => void }) {
  const [view, setView] = useState<View>('home')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      setDashboard(await api<Dashboard>('/patient/dashboard', {}, session))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar tu información.')
    }
  }, [session])

  useEffect(() => {
    let active = true
    api<Dashboard>('/patient/dashboard', {}, session)
      .then(value => { if (active) { setDashboard(value); setError('') } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No fue posible cargar tu información.') })
    return () => { active = false }
  }, [session])

  async function recordDose(medication: Medication, dose: DoseTime) {
    const scheduledAt = new Date(`${new Date().toISOString().slice(0, 10)}T${dose.time}:00`)
    try {
      await api(`/patient/medications/${medication.id}/doses`, {
        method: 'POST', body: JSON.stringify({ scheduledAt, status: 'taken', note: 'Registrada desde la aplicación' }),
      }, session)
      if (preferences.strongVibration) navigator.vibrate?.(80)
      setToast(`${medication.name} marcada como tomada`)
      await load()
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'No se pudo guardar la toma.')
    }
  }

  const title = ({ home: 'Inicio', treatment: 'Mi tratamiento', health: 'Mi salud', activity: 'Registrar actividad', symptoms: 'Reportar síntomas', notifications: 'Notificaciones', profile: 'Mi perfil' } as const)[view]

  return <div className="mobile-app">
    <header className="mobile-topbar">
      {view === 'home' ? <Logo compact /> : <button className="icon-button" aria-label="Volver" onClick={() => setView('home')}><Icon name="back" /></button>}
      <strong>{title}</strong>
      <button className="icon-button bell-button" aria-label="Notificaciones" onClick={() => setView('notifications')}><Icon name="bell" /><i /></button>
    </header>

    <main className="mobile-content">
      {error && <div className="alert danger"><Icon name="warning" /><span>{error}</span><button onClick={load}>Reintentar</button></div>}
      {!dashboard && !error ? <Loading /> : dashboard && <>
        {view === 'home' && <PatientHome data={dashboard} onNavigate={setView} />}
        {view === 'treatment' && <Treatment data={dashboard} onDose={recordDose} />}
        {view === 'health' && <Health data={dashboard} onSymptoms={() => setView('symptoms')} />}
        {view === 'activity' && <ActivityForm session={session} onSaved={async message => { setToast(message); await load(); setView('home') }} />}
        {view === 'symptoms' && <SymptomForm session={session} onSaved={async message => { setToast(message); await load(); setView('health') }} />}
        {view === 'notifications' && <Notifications session={session} />}
        {view === 'profile' && <section><div className="page-heading"><div className="avatar large">{initials(session.name)}</div><div><h2>{session.name}</h2><p>{session.email}</p></div></div><AccessibilityPreferences session={session} onChange={onPreferences} /><button className="button secondary wide logout" onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button></section>}
      </>}
    </main>

    {toast && <button className="toast" onClick={() => setToast('')}><Icon name="check" />{toast}</button>}
    <nav className="bottom-nav" aria-label="Navegación principal">
      {([['home', 'home', 'Inicio'], ['treatment', 'pill', 'Tratamiento'], ['health', 'health', 'Salud'], ['profile', 'user', 'Perfil']] as const).map(([target, icon, label]) =>
        <button className={view === target ? 'active' : ''} onClick={() => setView(target)} key={target}><Icon name={icon} /><span>{label}</span></button>)}
    </nav>
  </div>
}

function PatientHome({ data, onNavigate }: { data: Dashboard, onNavigate: (view: View) => void }) {
  const next = data.treatment.medications.flatMap(medication => medication.times.map(time => ({ medication, ...time }))).find(item => item.status === 'pending')
  return <section className="stack patient-home">
    <div className="welcome-row"><div className="avatar">{initials(data.user.name)}</div><div><small>Hola,</small><h2>{data.user.name.split(' ')[0]}</h2></div></div>
    {data.glucose ? <article className="glucose-hero">
      <div className="metric-heading"><span>Glucosa actual</span><b><i /> En vivo</b></div>
      <div className="metric-value">{data.glucose.value}<small>{data.glucose.unit}</small></div>
      <Sparkline values={data.glucose.series.slice(-10).map(point => point.value)} target={[data.glucose.glucoseTargetMin, data.glucose.glucoseTargetMax]} />
      <div className="metric-foot"><span>Glucómetro simulado · hace 1 min</span><span>En rango</span></div>
    </article> : <Empty title="Sin mediciones">Tu glucómetro simulado todavía no ha enviado datos.</Empty>}
    {next && <article className="card next-dose"><span className="soft-icon amber"><Icon name="pill" /></span><div><strong>{next.medication.name} {next.medication.dose}</strong><p>Próxima toma · {next.time} con comida</p></div><span className="badge amber">Hoy</span></article>}
    <div className="action-grid">
      <button onClick={() => onNavigate('treatment')}><span className="soft-icon blue"><Icon name="pill" /></span><strong>Mi tratamiento</strong><small>{data.treatment.completedToday} de {data.treatment.totalToday} tomas</small></button>
      <button onClick={() => onNavigate('activity')}><span className="soft-icon green"><Icon name="activity" /></span><strong>Actividad</strong><small>Registrar ejercicio</small></button>
      <button onClick={() => onNavigate('symptoms')}><span className="soft-icon coral"><Icon name="warning" /></span><strong>Síntomas</strong><small>¿Cómo te sientes?</small></button>
      <button onClick={() => onNavigate('health')}><span className="soft-icon amber"><Icon name="health" /></span><strong>Indicadores</strong><small>Ver evolución</small></button>
    </div>
    {data.nextAppointment && <article className="card appointment-card"><span className="soft-icon blue"><Icon name="calendar" /></span><div><strong>Próxima cita</strong><p>{data.nextAppointment.title} · {formatDate(data.nextAppointment.startsAt)}</p></div><span className="badge blue">Próxima</span></article>}
  </section>
}

function Treatment({ data, onDose }: { data: Dashboard, onDose: (medication: Medication, dose: DoseTime) => void }) {
  return <section className="stack treatment-screen">
    <article className="blue-summary"><div><strong>Cumplimiento de hoy</strong><b>{data.treatment.completedToday} de {data.treatment.totalToday}</b></div><Progress value={data.treatment.totalToday ? data.treatment.completedToday * 100 / data.treatment.totalToday : 0} /><small>Tu cuidador y médico pueden ver este avance</small></article>
    <h3>Medicamentos de hoy</h3>
    <div className="medication-list">
      {data.treatment.medications.flatMap(medication => medication.times.map(time => <article className={`medication-row ${time.status}`} key={`${medication.id}-${time.time}`}>
        <span className="soft-icon blue"><Icon name="pill" /></span><div><strong>{medication.name} {medication.dose}</strong><p>{time.time} · {medication.instructions}</p></div>
        <button className="dose-check" aria-label={`Marcar ${medication.name} de las ${time.time} como tomada`} disabled={time.status === 'taken'} onClick={() => onDose(medication, time)}>{time.status === 'taken' && <Icon name="check" />}</button>
      </article>))}
    </div>
    <article className="card doctor-note"><h3><Icon name="clipboard" /> Indicaciones del médico</h3><p>{data.treatment.doctorInstructions}</p></article>
  </section>
}

function Health({ data, onSymptoms }: { data: Dashboard, onSymptoms: () => void }) {
  const glucose = data.glucose
  return <section className="stack">
    <div className="health-grid">
      <article className="card"><small>Glucosa</small><strong>{glucose?.value ?? '—'} <em>{glucose?.unit}</em></strong><span className="status good">En rango</span></article>
      <article className="card"><small>Adherencia</small><strong>{data.treatment.adherence}%</strong><Progress value={data.treatment.adherence} /></article>
      <article className="card"><small>Actividad reciente</small><strong>{data.activities[0]?.durationMinutes ?? 0} <em>min</em></strong><span>{data.activities[0]?.type ?? 'Sin registro'}</span></article>
      <article className="card"><small>Síntomas recientes</small><strong>{data.symptoms.length}</strong><span>{data.symptoms[0]?.name ?? 'Ninguno'}</span></article>
    </div>
    {glucose && <article className="card chart-card"><h3>Glucosa · últimos 14 días</h3><Sparkline values={glucose.series.map(point => point.value)} target={[glucose.glucoseTargetMin, glucose.glucoseTargetMax]} /></article>}
    <button className="button primary wide" onClick={onSymptoms}><Icon name="plus" /> Reportar cómo me siento</button>
    <div><h3>Historial de síntomas</h3>{data.symptoms.map(symptom => <article className="timeline-row" key={symptom.id}><i className="timeline-dot coral"/><div><strong>{symptom.name} · {symptom.severity}/5</strong><p>{formatDate(symptom.occurredAt)} {symptom.notes && `· ${symptom.notes}`}</p></div></article>)}</div>
  </section>
}

function ActivityForm({ session, onSaved }: { session: Session, onSaved: (message: string) => void }) {
  const [type, setType] = useState('Caminata')
  const [duration, setDuration] = useState(30)
  const [intensity, setIntensity] = useState('Moderada')
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await api('/patient/activities', { method: 'POST', body: JSON.stringify({ type, durationMinutes: duration, intensity, occurredAt: new Date() }) }, session)
      onSaved('Actividad guardada')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar.') }
  }
  return <form className="stack activity-form" onSubmit={submit}>
    <fieldset className="chip-picker"><legend>Tipo de actividad</legend>{['Caminata', 'Bicicleta', 'Natación', 'Yoga', 'Fuerza'].map(value => <button type="button" className={type === value ? 'selected' : ''} onClick={() => setType(value)} key={value}>{value}</button>)}</fieldset>
    <fieldset><legend>Duración (minutos)</legend><div className="stepper"><button type="button" onClick={() => setDuration(Math.max(5, duration - 5))}>−</button><strong>{duration}</strong><button type="button" onClick={() => setDuration(Math.min(300, duration + 5))}>＋</button></div></fieldset>
    <fieldset className="segment"><legend>Intensidad</legend>{['Ligera', 'Moderada', 'Intensa'].map(value => <button type="button" className={intensity === value ? 'selected' : ''} onClick={() => setIntensity(value)} key={value}>{value}</button>)}</fieldset>
    <div className="device-note"><Icon name="activity" /><span><strong>Reloj conectado</strong> · 3,420 pasos y FC promedio 96 lpm detectados</span></div>
    {error && <p className="form-error">{error}</p>}<button className="button primary wide"><Icon name="check" /> Guardar actividad</button>
  </form>
}

function SymptomForm({ session, onSaved }: { session: Session, onSaved: (message: string) => void }) {
  const [severity, setSeverity] = useState(2)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    try {
      await api('/patient/symptoms', { method: 'POST', body: JSON.stringify({ name: data.get('name'), severity, notes: data.get('notes'), occurredAt: new Date() }) }, session)
      onSaved('Síntoma registrado')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar.') }
  }
  return <form className="stack form-stack card symptom-form" onSubmit={submit}><label>¿Qué sientes?<input name="name" placeholder="Ej. Mareo, cansancio o sed" required /></label><fieldset><legend>Intensidad</legend><div className="severity">{[1,2,3,4,5].map(value => <button type="button" className={severity === value ? 'selected' : ''} onClick={() => setSeverity(value)} key={value}>{value}</button>)}</div><small>1 es leve y 5 es muy intenso</small></fieldset><label>Notas (opcional)<textarea name="notes" placeholder="Describe cuándo comenzó y cómo te sientes" /></label>{error && <p className="form-error">{error}</p>}<button className="button primary wide">Guardar síntoma</button></form>
}

function Notifications({ session }: { session: Session }) {
  const [items, setItems] = useState<{ id: string, category: string, title: string, message: string, createdAt: string, isRead: boolean }[] | null>(null)
  const [filter, setFilter] = useState('all')
  useEffect(() => { api<typeof items>('/profile/notifications', {}, session).then(setItems).catch(() => setItems([])) }, [session])
  const groups = useMemo(() => {
    const filtered = items?.filter(item => filter === 'all' || (filter === 'medication' ? ['medication', 'treatment'].includes(item.category) : item.category === filter))
    return filtered ? { today: filtered.filter(item => new Date(item.createdAt).toDateString() === new Date().toDateString()), before: filtered.filter(item => new Date(item.createdAt).toDateString() !== new Date().toDateString()) } : null
  }, [items, filter])
  if (!groups) return <Loading />
  return <section className="stack notifications"><div className="filter-chips">{([['all','Todas'],['medication','Medicamentos'],['appointment','Citas'],['alert','Alertas']] as const).map(([value,label]) => <button className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div>{([['Hoy', groups.today], ['Anteriores', groups.before]] as const).map(([label, notifications]) => notifications.length > 0 && <div key={label}><h4>{label}</h4><article className="card notification-list">{notifications.map(item => <div className="notification-row" key={item.id}><span className={`soft-icon ${item.category}`}><Icon name={item.category === 'appointment' ? 'calendar' : item.category === 'alert' ? 'warning' : 'pill'} /></span><div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.createdAt)}</small></div>{!item.isRead && <i />}</div>)}</article></div>)}</section>
}

function initials(name: string) { return name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
