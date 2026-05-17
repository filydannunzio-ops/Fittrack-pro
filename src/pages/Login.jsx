import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [tab, setTab] = useState('login')
  const [ruolo, setRuolo] = useState('atleta')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg({ type: 'error', text: error.message })
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setMsg({ type: 'error', text: error.message }); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        nome_completo: nome,
        ruolo,
      })
      setMsg({ type: 'success', text: 'Account creato! Controlla la tua email per confermare.' })
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">💪</div>
          <div className="login-title">FitTrack Pro</div>
          <div className="login-sub">Allenati con il tuo personal trainer</div>
        </div>

        <div className="tab-row">
          <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>Accedi</button>
          <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>Registrati</button>
        </div>

        {msg && (
          <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {msg.text}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la-tua-email@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Accesso in corso...' : 'Accedi →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Sono un</label>
              <div className="prog-selector">
                <div className={`prog-pill ${ruolo === 'atleta' ? 'active' : ''}`} onClick={() => setRuolo('atleta')}>🏋️ Atleta</div>
                <div className={`prog-pill ${ruolo === 'trainer' ? 'active' : ''}`} onClick={() => setRuolo('trainer')}>📋 Personal Trainer</div>
              </div>
            </div>
            <div className="form-group">
              <label>Nome completo</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario Rossi" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="la-tua-email@email.com" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 8 caratteri" minLength={8} required />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Creazione account...' : 'Crea account →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
