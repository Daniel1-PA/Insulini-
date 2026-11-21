type IconName = 'home' | 'pill' | 'health' | 'user' | 'bell' | 'calendar' | 'users' | 'clipboard' | 'warning' | 'settings' | 'activity' | 'plus' | 'back' | 'check' | 'heart' | 'note' | 'logout' | 'eye' | 'search' | 'message'

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
  pill: <><path d="M8.4 19.6a4.8 4.8 0 0 1-6.8-6.8l9.2-9.2a4.8 4.8 0 1 1 6.8 6.8Z"/><path d="m7.4 7 6.8 6.8"/></>,
  health: <><path d="M3 12h4l2-7 4 14 2.5-7H21"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></>,
  warning: <><path d="M10.3 2.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  activity: <><path d="M4 17 8 7l4 10 3-7 2 4h4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  back: <><path d="m15 18-6-6 6-6"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></>,
  note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h5v18h-5"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></>,
}

export function Icon({ name, size = 20 }: { name: IconName, size?: number }) {
  return <svg className="icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4c-4 0-7 3-7 7v4c0 4-2 5-2 7 0 3 4 6 9 6s9-3 9-6c0-2-2-3-2-7v-4c0-4-3-7-7-7Z" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 15h8M16 11v8" stroke="currentColor" strokeWidth="2"/></svg></span>{!compact && <strong>Insulini</strong>}</div>
}
