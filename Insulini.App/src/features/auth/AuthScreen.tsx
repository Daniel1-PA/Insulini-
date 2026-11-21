import { useState, type FormEvent } from 'react'
import { Icon, Logo } from '../../components/Icon'
import { api, type Session } from '../../lib/api'

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<Session['role']>('Patient')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function login(email: string, password: string) {
    setBusy(true)
    setError('')
    try {
      onAuthenticated(await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void login(String(data.get('email')), String(data.get('password')))
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const session = await api<Session>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.get('name'),
          birthDate: data.get('birthDate') || null,
          email: data.get('email'),
          password: data.get('password'),
          invitationCode: data.get('invitationCode') || null,
          role,
        }),
      })
      onAuthenticated(session)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear la cuenta.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-story">
      <Logo />
      <div>
        <h1>Tu salud, acompañada todos los días.</h1>
        <p>Tratamiento, mediciones y seguimiento médico en un solo lugar.</p>
      </div>
      <div className="story-metrics">
        <span><strong>Simple</strong> para pacientes</span>
        <span><strong>Claro</strong> para cuidadores</span>
        <span><strong>Completo</strong> para médicos</span>
      </div>
    </section>

    <section className="auth-panel">
      <div className="auth-card">
        <div className="mobile-logo"><Logo /></div>
        {mode === 'login' ? <>
          <header><h2>Bienvenido de nuevo</h2><p>Cuida tu salud, paso a paso</p></header>
          <form onSubmit={submitLogin} className="form-stack">
            <label>Correo electrónico<input name="email" type="email" defaultValue="paciente@insulini.mx" autoComplete="email" required /></label>
            <label>Contraseña<input name="password" type="password" defaultValue="Insulini123!" autoComplete="current-password" required /></label>
            <button className="link-button forgot" type="button" onClick={() => setError('En el demo puedes usar cualquiera de los accesos rápidos con la contraseña preconfigurada.')}>¿Olvidaste tu contraseña?</button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary wide" disabled={busy}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</button>
          </form>
          <div className="divider"><span>accesos de demostración</span></div>
          <div className="demo-logins">
            <button onClick={() => login('paciente@insulini.mx', 'Insulini123!')}><Icon name="user" /> Paciente</button>
            <button onClick={() => login('cuidador@insulini.mx', 'Insulini123!')}><Icon name="heart" /> Cuidador</button>
            <button onClick={() => login('medico@insulini.mx', 'Insulini123!')}><Icon name="health" /> Médico</button>
          </div>
          <p className="switch-auth">¿No tienes cuenta? <button className="link-button" onClick={() => setMode('register')}>Regístrate</button></p>
        </> : <>
          <button className="icon-button auth-back" aria-label="Volver" onClick={() => setMode('login')}><Icon name="back" /></button>
          <header><h2>Crear cuenta</h2><p>Completa tus datos y elige cómo usarás Insulini.</p></header>
          <form onSubmit={submitRegister} className="form-stack">
            <label>Nombre completo<input name="name" autoComplete="name" placeholder="María López Hernández" required /></label>
            <div className="form-grid"><label>Fecha de nacimiento<input name="birthDate" type="date" /></label><label>Correo electrónico<input name="email" type="email" autoComplete="email" required /></label></div>
            <label>Contraseña<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
            <label>Código de invitación del médico (opcional)<input name="invitationCode" placeholder="DR-4821" /></label>
            <fieldset className="role-picker"><legend>¿Quién eres?</legend>
              {([['Patient', 'Paciente', 'Registro mi tratamiento y salud'], ['Caregiver', 'Cuidador o familiar', 'Acompaño a un paciente'], ['Doctor', 'Médico', 'Doy seguimiento a pacientes']] as const).map(([value, label, hint]) =>
                <button type="button" className={role === value ? 'selected' : ''} onClick={() => setRole(value)} key={value}><span><strong>{label}</strong><small>{hint}</small></span>{role === value && <Icon name="check" />}</button>)}
            </fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button primary wide" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
          </form>
        </>}
      </div>
    </section>
  </main>
}
