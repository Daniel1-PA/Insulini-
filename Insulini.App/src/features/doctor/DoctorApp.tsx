import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Icon, Logo } from '../../components/Icon'
import { AccessibilityPreferences, Empty, Loading, Progress, Sparkline, type Preferences } from '../../components/Shared'
import { api, type Session } from '../../lib/api'

type PatientSummary = { id: string, name: string, age?: number, condition: string, glucose?: { value: number, unit: string }, adherence: number, symptom?: { name: string, severity: number }, status: string }
type DoctorData = { stats: { activePatients: number, alertsToday: number, averageAdherence: number, appointmentsThisWeek: number }, patients: PatientSummary[] }
type Medication = { id?: string, name: string, dose: string, frequency: string, instructions: string, reminderTimes: string[], adherence?: number }
type PatientDetailData = {
  patient: { id: string, name: string, age?: number, condition: string, caregiver?: string, updatedAt?: string }
  indicators: { glucose?: number, glucoseUnit?: string, timeInRange: number, hba1c?: number, adherence: number, weeklyActivityMinutes: number }
  target: { min: number, max: number }
  glucoseSeries: { measuredAt: string, value: number }[]
  symptoms: { id: string, name: string, severity: number, occurredAt: string, author: string, role: string }[]
  treatment: { doctorInstructions: string, medications: Medication[] }
}
type Appointment = { id: string, patientId: string, patientName: string, title: string, startsAt: string, modality: string, status: string }
type View = 'patients' | 'detail' | 'agenda' | 'prescriptions' | 'alerts' | 'settings'

export function DoctorApp({ session, onPreferences, onLogout }: { session: Session, onPreferences: (value: Preferences) => void, onLogout: () => void }) {
  const [view, setView] = useState<View>('patients')
  const [data, setData] = useState<DoctorData | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<PatientDetailData | null>(null)
  const [toast, setToast] = useState('')

  const loadPatients = useCallback(() => api<DoctorData>('/doctor/patients', {}, session).then(setData).catch(error => setToast(error.message)), [session])
  const loadDetail = useCallback((id: string) => api<PatientDetailData>(`/doctor/patients/${id}`, {}, session).then(setDetail).catch(error => setToast(error.message)), [session])
  useEffect(() => { void loadPatients() }, [loadPatients])
  useEffect(() => { if (selectedId) void loadDetail(selectedId) }, [selectedId, loadDetail])

  function selectPatient(id: string) { setSelectedId(id); setDetail(null); setView('detail') }
  function navigate(next: View) {
    if (next === 'prescriptions' && !selectedId && data?.patients[0]) setSelectedId(data.patients[0].id)
    setView(next)
  }

  return <div className="doctor-shell">
    <aside className="doctor-sidebar"><Logo /><nav>{([['patients','users','Pacientes'],['agenda','calendar','Agenda'],['prescriptions','clipboard','Recetas'],['alerts','bell','Alertas'],['settings','settings','Ajustes']] as const).map(([target, icon, label]) => <button className={(view === target || (target === 'patients' && view === 'detail')) ? 'active' : ''} onClick={() => navigate(target)} key={target}><Icon name={icon} /><span>{label}</span>{target === 'alerts' && data?.stats.alertsToday ? <b>{data.stats.alertsToday}</b> : null}</button>)}</nav><div className="doctor-account"><div className="avatar">{initials(session.name)}</div><div><strong>{session.name}</strong><small>Endocrinología</small></div></div></aside>
    <main className="doctor-main">
      {!data ? <Loading /> : <>
        {view === 'patients' && <PatientList data={data} onSelect={selectPatient} onInvite={() => setToast('Código de invitación: DR-4821')} />}
        {view === 'detail' && (detail ? <PatientDetail data={detail} onEdit={() => setView('prescriptions')} onBack={() => setView('patients')} /> : <Loading />)}
        {view === 'agenda' && <Agenda session={session} patients={data.patients} onSaved={message => setToast(message)} />}
        {view === 'prescriptions' && (detail ? <PrescriptionEditor session={session} data={detail} onSaved={async message => { setToast(message); await loadDetail(detail.patient.id); await loadPatients() }} /> : <Loading />)}
        {view === 'alerts' && <Alerts patients={data.patients} onSelect={selectPatient} />}
        {view === 'settings' && <section className="doctor-settings"><Header title="Ajustes" subtitle="Accesibilidad y sesión" /><AccessibilityPreferences session={session} onChange={onPreferences} /><button className="button secondary logout" onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button></section>}
      </>}
    </main>
    {toast && <button className="toast" onClick={() => setToast('')}><Icon name="check" />{toast}</button>}
  </div>
}

function Header({ title, subtitle, actions }: { title: string, subtitle?: string, actions?: React.ReactNode }) {
  return <header className="doctor-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="header-actions">{actions}</div>}</header>
}

function PatientList({ data, onSelect, onInvite }: { data: DoctorData, onSelect: (id: string) => void, onInvite: () => void }) {
  const [search, setSearch] = useState('')
  const patients = data.patients.filter(patient => patient.name.toLowerCase().includes(search.toLowerCase()))
  return <section><Header title="Mis pacientes" subtitle="Información actualizada de tu consulta" actions={<><label className="search"><Icon name="search" /><input aria-label="Buscar paciente" placeholder="Buscar paciente…" value={search} onChange={event => setSearch(event.target.value)} /></label><button className="button primary" onClick={onInvite}><Icon name="plus" /> Invitar paciente</button></>} />
    <div className="stats-grid"><Stat label="Pacientes activos" value={data.stats.activePatients} /><Stat label="Alertas hoy" value={data.stats.alertsToday} tone="danger" /><Stat label="Adherencia promedio" value={`${data.stats.averageAdherence}%`} tone="success" /><Stat label="Citas esta semana" value={data.stats.appointmentsThisWeek} /></div>
    <div className="patient-table card"><div className="table-head"><span>Paciente</span><span>Glucosa</span><span>Adherencia</span><span>Último síntoma</span><span>Estado</span><i /></div>{patients.map(patient => <button className="patient-row" onClick={() => onSelect(patient.id)} key={patient.id}><span className="patient-cell"><i className="avatar">{initials(patient.name)}</i><span><strong>{patient.name}</strong><small>{patient.age} años · {patient.condition}</small></span></span><span><strong>{patient.glucose?.value ?? '—'} <small>{patient.glucose?.unit}</small></strong></span><span><strong>{patient.adherence}%</strong></span><span>{patient.symptom ? `${patient.symptom.name} · ${patient.symptom.severity}/5` : '—'}</span><span><em className={`status ${patient.status === 'Estable' ? 'good' : patient.status === 'Riesgo alto' ? 'bad' : 'warn'}`}>{patient.status}</em></span><Icon name="back" /></button>)}{patients.length === 0 && <Empty title="Sin resultados">No encontramos pacientes con ese nombre.</Empty>}</div>
  </section>
}

function PatientDetail({ data, onEdit, onBack }: { data: PatientDetailData, onEdit: () => void, onBack: () => void }) {
  return <section><Header title={data.patient.name} subtitle={`${data.patient.age} años · ${data.patient.condition}${data.patient.caregiver ? ` · Cuidadora: ${data.patient.caregiver}` : ''}`} actions={<button className="button primary" onClick={onEdit}><Icon name="clipboard" /> Editar receta</button>} /><button className="back-link" onClick={onBack}><Icon name="back" /> Volver a pacientes</button>
    <div className="stats-grid detail-stats"><Stat label="Glucosa actual" value={`${data.indicators.glucose ?? '—'} ${data.indicators.glucoseUnit ?? ''}`} /><Stat label="Tiempo en rango (14 d)" value={`${data.indicators.timeInRange}%`} tone="success" /><Stat label="HbA1c estimada" value={`${data.indicators.hba1c ?? '—'}%`} /><Stat label="Adherencia receta" value={`${data.indicators.adherence}%`} tone="success" /></div>
    <div className="detail-layout"><article className="card glucose-chart"><div className="section-title"><h3>Glucosa · últimos 14 días</h3><small>Rango objetivo {data.target.min}–{data.target.max} mg/dL</small></div><Sparkline values={data.glucoseSeries.map(point => point.value)} target={[data.target.min, data.target.max]} /><div className="chart-axis"><span>{formatShort(data.glucoseSeries[0]?.measuredAt)}</span><span>Hoy</span></div></article><article className="card symptoms-panel"><h3><Icon name="warning" /> Síntomas reportados</h3>{data.symptoms.slice(0, 4).map(symptom => <div key={symptom.id}><strong>{symptom.name} · {symptom.severity}/5</strong><small>{formatDate(symptom.occurredAt)} · por {symptom.role === 'Caregiver' ? 'cuidador' : 'paciente'}</small></div>)}</article></div>
    <div className="detail-layout treatment-layout"><article className="card prescription-summary"><h3><Icon name="clipboard" /> Receta y cumplimiento</h3>{data.treatment.medications.map(item => <div className="prescription-row" key={item.id}><span><strong>{item.name}</strong><small>{item.frequency}</small></span><b>{item.dose}</b><em className={`status ${(item.adherence ?? 0) >= 80 ? 'good' : 'warn'}`}>{item.adherence}%</em></div>)}</article><article className="card activity-summary"><h3>Actividad semanal</h3><strong>{data.indicators.weeklyActivityMinutes} min</strong><Progress value={Math.min(100, data.indicators.weeklyActivityMinutes / 1.5)} /><p>Meta sugerida: 150 min</p></article></div>
  </section>
}

function Agenda({ session, patients, onSaved }: { session: Session, patients: PatientSummary[], onSaved: (message: string) => void }) {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const load = useCallback(() => api<Appointment[]>('/doctor/appointments', {}, session).then(setAppointments), [session])
  useEffect(() => { void load() }, [load])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const patientId = String(form.get('patientId'))
    try { await api(`/doctor/patients/${patientId}/appointments`, { method: 'POST', body: JSON.stringify({ title: form.get('title'), startsAt: new Date(String(form.get('startsAt'))), modality: form.get('modality') }) }, session); event.currentTarget.reset(); await load(); onSaved('Cita agendada y paciente notificado') }
    catch (reason) { onSaved(reason instanceof Error ? reason.message : 'No se pudo agendar.') }
  }
  return <section><Header title="Agenda" subtitle="Consultas y seguimiento programado" /><div className="agenda-layout"><article className="card agenda-list"><h3>Próximas citas</h3>{appointments?.map(item => <div className="appointment-row" key={item.id}><time><b>{new Date(item.startsAt).getDate()}</b><span>{new Intl.DateTimeFormat('es-MX',{month:'short'}).format(new Date(item.startsAt))}</span></time><div><strong>{item.patientName}</strong><p>{item.title} · {formatDate(item.startsAt)}</p></div><span className="status good">{item.status}</span></div>)}{appointments?.length === 0 && <Empty title="Agenda libre">No tienes citas próximas.</Empty>}</article><form className="card stack appointment-form" onSubmit={submit}><h3><Icon name="calendar" /> Agendar cita</h3><label>Paciente<select name="patientId">{patients.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Motivo<input name="title" defaultValue="Consulta de control" required /></label><label>Fecha y hora<input name="startsAt" type="datetime-local" min={new Date().toISOString().slice(0,16)} required /></label><label>Modalidad<select name="modality"><option>Presencial</option><option>Videollamada</option></select></label><button className="button primary"><Icon name="calendar" /> Agendar y notificar</button></form></div></section>
}

function PrescriptionEditor({ session, data, onSaved }: { session: Session, data: PatientDetailData, onSaved: (message: string) => void }) {
  const [medications, setMedications] = useState<Medication[]>(data.treatment.medications)
  const [instructions, setInstructions] = useState(data.treatment.doctorInstructions)
  function change(index: number, field: keyof Medication, value: string) { setMedications(items => items.map((item, position) => position === index ? { ...item, [field]: field === 'reminderTimes' ? value.split(',').map(part => part.trim()) : value } : item)) }
  async function save() {
    try { await api(`/doctor/patients/${data.patient.id}/treatment`, { method: 'PUT', body: JSON.stringify({ doctorInstructions: instructions, medications }) }, session); onSaved('Receta guardada y paciente notificado') }
    catch (reason) { onSaved(reason instanceof Error ? reason.message : 'No se pudo guardar.') }
  }
  return <section><Header title={`Receta · ${data.patient.name}`} subtitle="Configura el tratamiento y los horarios de recordatorio" actions={<button className="button primary" onClick={save}><Icon name="check" /> Guardar y notificar</button>} /><div className="prescription-editor"><div className="stack">{medications.map((medication, index) => <article className="card medication-editor" key={medication.id ?? index}><div className="section-title"><h3><Icon name="pill" /> Medicamento {index + 1}</h3>{medications.length > 1 && <button className="link-button danger-text" onClick={() => setMedications(items => items.filter((_, position) => position !== index))}>Quitar</button>}</div><div className="form-grid three"><label>Medicamento<input value={medication.name} onChange={event => change(index,'name',event.target.value)} /></label><label>Dosis<input value={medication.dose} onChange={event => change(index,'dose',event.target.value)} /></label><label>Frecuencia<input value={medication.frequency} onChange={event => change(index,'frequency',event.target.value)} /></label></div><label>Horarios (separados por coma)<input value={medication.reminderTimes.join(', ')} onChange={event => change(index,'reminderTimes',event.target.value)} /></label><label>Indicaciones<input value={medication.instructions} onChange={event => change(index,'instructions',event.target.value)} /></label></article>)}<button className="button pale add-medication" onClick={() => setMedications(items => [...items, { name: '', dose: '', frequency: '1 vez al día', instructions: '', reminderTimes: ['08:00'] }])}><Icon name="plus" /> Agregar medicamento</button></div><aside className="card doctor-instructions"><h3>Indicaciones para paciente y cuidador</h3><textarea value={instructions} onChange={event => setInstructions(event.target.value)} /><div className="blue-note"><Icon name="bell" /><p>Al guardar se enviará una notificación al paciente.</p></div></aside></div></section>
}

function Alerts({ patients, onSelect }: { patients: PatientSummary[], onSelect: (id: string) => void }) {
  const alerts = patients.filter(item => item.status !== 'Estable')
  return <section><Header title="Alertas" subtitle="Pacientes que necesitan atención" />{alerts.length ? <div className="stack alert-list">{alerts.map(patient => <button className="card alert-patient" onClick={() => onSelect(patient.id)} key={patient.id}><span className="soft-icon coral"><Icon name="warning" /></span><div><strong>{patient.name}</strong><p>{patient.glucose && patient.glucose.value > 180 ? `Glucosa elevada: ${patient.glucose.value} mg/dL` : `Adherencia baja: ${patient.adherence}%`}</p></div><span className={`status ${patient.status === 'Riesgo alto' ? 'bad' : 'warn'}`}>{patient.status}</span></button>)}</div> : <Empty title="Todo en orden">No hay alertas activas.</Empty>}</section>
}

function Stat({ label, value, tone }: { label: string, value: string | number, tone?: string }) { return <article className="stat-card card"><small>{label}</small><strong className={tone}>{value}</strong></article> }
function initials(name: string) { return name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase() }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function formatShort(value?: string) { return value ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(value)) : '' }
