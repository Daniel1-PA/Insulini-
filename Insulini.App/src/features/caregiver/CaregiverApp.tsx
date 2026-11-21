import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon } from '../../components/Icon'
import { AccessibilityPreferences, Empty, Loading, Progress, Sparkline, type Preferences } from '../../components/Shared'
import { api, type Session } from '../../lib/api'

type CareDashboard = {
  patient: null | { id: string, name: string, age?: number, condition: string }
  message?: string
  latest: { glucose?: { value: number, unit: string }, heartRate?: { value: number, unit: string }, weight?: { value: number, unit: string } }
  adherence: number
  completedToday: number
  totalToday: number
  activity?: { type: string, durationMinutes: number, intensity: string, occurredAt: string }
  alerts: { id: string, title: string, message: string, createdAt: string }[]
  medications: { id: string, name: string, dose: string, frequency: string, week: { date: string, status: string }[] }[]
  timeline: { id: string, kind: string, summary: string, createdAt: string, author: string, role: string }[]
}

type View = 'home' | 'recipe' | 'progress' | 'profile'

export function CaregiverApp({ session, onPreferences, onLogout }: { session: Session, onPreferences: (value: Preferences) => void, onLogout: () => void }) {
  const [view, setView] = useState<View>('home')
  const [data, setData] = useState<CareDashboard | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try { setData(await api<CareDashboard>('/caregiver/dashboard', {}, session)); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible cargar el seguimiento.') }
  }, [session])
  useEffect(() => {
    let active = true
    api<CareDashboard>('/caregiver/dashboard', {}, session)
      .then(value => { if (active) { setData(value); setError('') } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No fue posible cargar el seguimiento.') })
    return () => { active = false }
  }, [session])

  if (!data && !error) return <div className="mobile-app"><Loading /></div>

  return <div className="mobile-app caregiver-app">
    <header className="mobile-header"><div><small>Hola, {session.name.split(' ')[0]}</small><h1>{view === 'home' ? 'Cuidando a' : view === 'recipe' ? 'Seguimiento de receta' : view === 'progress' ? 'Avance del tratamiento' : 'Mi perfil'}</h1></div><button className="icon-button" aria-label="Ver alertas" onClick={() => setView('home')}><Icon name="bell" /></button></header>
    <main className="mobile-content">
      {error && <div className="alert danger"><Icon name="warning" />{error}</div>}
      {data?.patient ? <>
        {view === 'home' && <CareHome data={data} onRemind={async () => {
          try { const result = await api<{ message: string }>('/caregiver/reminder', { method: 'POST' }, session); setToast(result.message) }
          catch (reason) { setToast(reason instanceof Error ? reason.message : 'No se pudo enviar el recordatorio.') }
        }} />}
        {view === 'recipe' && <Recipe data={data} />}
        {view === 'progress' && <ProgressForm data={data} session={session} onSaved={async value => { setToast(value); await load() }} />}
        {view === 'profile' && <section><div className="page-heading"><div className="avatar large">{initials(session.name)}</div><div><h2>{session.name}</h2><p>{session.email}</p></div></div><AccessibilityPreferences session={session} onChange={onPreferences} /><button className="button secondary wide logout" onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button></section>}
      </> : <Empty title="Sin paciente vinculado">{data?.message ?? 'Pide al paciente que te vincule como cuidador.'}</Empty>}
    </main>
    {toast && <button className="toast" onClick={() => setToast('')}><Icon name="check" />{toast}</button>}
    <nav className="bottom-nav">{([['home','home','Inicio'],['recipe','clipboard','Receta'],['progress','note','Avance'],['profile','user','Perfil']] as const).map(([target, icon, label]) => <button className={view === target ? 'active' : ''} onClick={() => setView(target)} key={target}><Icon name={icon} /><span>{label}</span></button>)}</nav>
  </div>
}

function CareHome({ data, onRemind }: { data: CareDashboard, onRemind: () => void }) {
  const patient = data.patient!
  return <section className="stack">
    <article className="card patient-switch"><div className="avatar">{initials(patient.name)}</div><div><strong>{patient.name}, {patient.age} años</strong><p>{patient.condition}</p></div><span>⌄</span></article>
    {data.alerts[0] && <article className="alert danger"><Icon name="warning" /><div><strong>{data.alerts[0].title}</strong><p>{data.alerts[0].message}</p></div></article>}
    <div className="action-pair"><a className="button primary" href="tel:+529981234567">Llamar</a><button className="button pale" onClick={onRemind}><Icon name="bell" /> Recordarle</button></div>
    <div className="care-metrics">
      <article className="card"><small>Glucosa</small><strong>{data.latest.glucose?.value ?? '—'} <em>{data.latest.glucose?.unit}</em></strong><Sparkline values={[132,126,119,118,134,150,156,153]} /></article>
      <article className="card"><small>Ritmo cardiaco</small><strong>{data.latest.heartRate?.value ?? '—'} <em>{data.latest.heartRate?.unit}</em></strong><Sparkline values={[64,68,70,68,71,72,76,80]} /></article>
    </div>
    <article className="card compliance-card"><div><h3>Cumplimiento hoy</h3><strong>{data.completedToday} / {data.totalToday}</strong></div><Progress value={data.totalToday ? data.completedToday * 100 / data.totalToday : 0} />{data.activity && <p><Icon name="activity" /> {data.activity.type} {data.activity.durationMinutes} min <span className="status good">Cumplido</span></p>}</article>
  </section>
}

function Recipe({ data }: { data: CareDashboard }) {
  return <section className="stack"><article className="blue-note"><Icon name="clipboard" /><div><strong>Receta vigente</strong><p>Indicaciones activas del equipo médico</p></div></article><div className="section-title"><h3>Esta semana</h3><span className="status good">Adherencia {data.adherence}%</span></div>{data.medications.map(medication => <article className="card week-medication" key={medication.id}><div><strong>{medication.name} {medication.dose}</strong><small>{medication.frequency}</small></div><div className="week-days">{medication.week.map((day, index) => <div key={day.date}><small>{['L','M','M','J','V','S','D'][index]}</small><span className={day.status}>{day.status === 'taken' ? '✓' : day.status === 'omitted' ? '×' : day.status === 'partial' ? '−' : '·'}</span></div>)}</div></article>)}<div className="legend"><span><i className="taken" /> Tomada</span><span><i className="partial" /> Parcial</span><span><i className="omitted" /> Omitida</span></div></section>
}

function ProgressForm({ data, session, onSaved }: { data: CareDashboard, session: Session, onSaved: (message: string) => void }) {
  const [kind, setKind] = useState<'dose' | 'measurement' | 'note'>('dose')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const measurement = String(form.get('measurementType') ?? 'glucose')
    try {
      await api('/caregiver/progress', { method: 'POST', body: JSON.stringify({
        patientId: data.patient!.id, kind,
        medicationId: kind === 'dose' ? form.get('medicationId') : null,
        status: kind === 'dose' ? 'taken' : null,
        measurementType: kind === 'measurement' ? measurement : null,
        value: kind === 'measurement' ? Number(form.get('value')) : null,
        unit: measurement === 'weight' ? 'kg' : 'mg/dL', note: form.get('note'),
      }) }, session)
      event.currentTarget.reset(); setError(''); onSaved('Avance registrado como cuidador')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo registrar.') }
  }
  return <section className="stack"><form className="card stack progress-form" onSubmit={submit}><h3><Icon name="note" /> Nuevo registro</h3><div className="segment"><button type="button" className={kind === 'dose' ? 'selected' : ''} onClick={() => setKind('dose')}>Toma</button><button type="button" className={kind === 'measurement' ? 'selected' : ''} onClick={() => setKind('measurement')}>Medición</button><button type="button" className={kind === 'note' ? 'selected' : ''} onClick={() => setKind('note')}>Nota</button></div>{kind === 'dose' && <label>Medicamento<select name="medicationId">{data.medications.map(item => <option value={item.id} key={item.id}>{item.name} {item.dose}</option>)}</select></label>}{kind === 'measurement' && <div className="form-grid"><label>Indicador<select name="measurementType"><option value="glucose">Glucosa</option><option value="weight">Peso</option></select></label><label>Valor<input name="value" type="number" step="0.1" required /></label></div>}<label>{kind === 'note' ? 'Nota compartida' : 'Comentario (opcional)'}<textarea name="note" placeholder="Escribe un comentario breve" required={kind === 'note'} /></label>{error && <p className="form-error">{error}</p>}<button className="button success wide"><Icon name="check" /> Registrar como cuidador</button></form><div><h3>Bitácora compartida</h3><article className="card timeline">{data.timeline.map(item => <div className="timeline-item" key={item.id}><i className={item.kind} /><div><strong>{item.summary}</strong><p>{formatDate(item.createdAt)} · {item.author}</p></div><span>{item.role === 'Caregiver' ? 'Cuidador' : 'Paciente'}</span></div>)}</article></div></section>
}

function initials(name: string) { return name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
