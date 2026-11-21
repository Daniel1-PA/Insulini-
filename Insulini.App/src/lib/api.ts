export type Session = {
  token: string
  userId: string
  name: string
  email: string
  role: 'Patient' | 'Caregiver' | 'Doctor'
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export async function api<T>(path: string, options: RequestInit = {}, session?: Session | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'No fue posible conectar con Insulini.' }))
    throw new Error(error.message ?? 'Ocurrió un error inesperado.')
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export function saveSession(session: Session | null) {
  if (session) localStorage.setItem('insulini-session', JSON.stringify(session))
  else localStorage.removeItem('insulini-session')
}

export function storedSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem('insulini-session') ?? 'null')
  } catch {
    return null
  }
}
