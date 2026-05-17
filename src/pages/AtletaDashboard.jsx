import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOut } from '../lib/supabase.js'

export default function AtletaDashboard({ profile }) {
  const [schede, setSchede] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetch() {
      const [{ data: s }, { data: l }] = await Promise.all([
        supabase.from('schede').select('*').eq('atleta_id', profile.id).eq('attiva', true).order('created_at', { ascending: false }),
        supabase.from('workout_logs').select('*').eq('atleta_id', profile.id).order('data', { ascending: false }).limit(10),
      ])
      setSchede(s || [])
      setLogs(l || [])
      setLoading(false)
    }
    fetch()
  }, [profile.id])

  const settimanaAttuale = calcolaSettimana(logs)
  const aderenza = calcolaAderenza(logs)

  if (loading) return <div className="app-shell" style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>Caricamento...</div>

  return (
    <div className="app-shell" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="app-header">
        <div className="logo">
          <div className="logo-icon">💪</div>
          FitTrack Pro
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge-role">🏋️ Atleta</span>
          <button className="btn-logout" onClick={signOut}>Esci</button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Ciao, {profile.nome_completo?.split(' ')[0]} 👋</div>
        <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Settimana {settimanaAttuale} di allenamento</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-val">{logs.length}</div><div className="stat-lbl">Workout totali</div></div>
        <div className="stat-card"><div className="stat-val">{aderenza}%</div><div className="stat-lbl">Aderenza</div></div>
        <div className="stat-card"><div className="stat-val">{schede.length}</div><div className="stat-lbl">Schede attive</div></div>
      </div>

      <p className="section-title">Le mie schede</p>
      {schede.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#888', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          Il tuo trainer non ha ancora creato schede per te.<br />
          <span style={{ fontSize: 13 }}>Riceverai una notifica quando saranno disponibili.</span>
        </div>
      )}
      {schede.map(s => {
        const ultimoLog = logs.find(l => l.scheda_id === s.id)
        return (
          <div key={s.id} className="card card-clickable scheda-item" onClick={() => navigate(`/workout/${s.id}`)}>
            <div className="scheda-item-icon">{getIcon(s.nome)}</div>
            <div className="scheda-item-info">
              <div className="scheda-item-title">{s.nome}</div>
              <div className="scheda-item-sub">
                {s.esercizi?.length || 0} esercizi
                {ultimoLog && ` · Ultima: ${new Date(ultimoLog.data).toLocaleDateString('it-IT')}`}
              </div>
              {s.descrizione && <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>{s.descrizione}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              {ultimoLog && <span className="badge badge-green">✓ Completata</span>}
              <span className="scheda-item-arrow">›</span>
            </div>
          </div>
        )
      })}

      <p className="section-title" style={{ marginTop: 24 }}>Storico allenamenti</p>
      {logs.length === 0 && <div className="card" style={{ color: '#888', textAlign: 'center' }}>Completa il tuo primo workout!</div>}
      {logs.slice(0, 5).map(l => (
        <div key={l.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{l.schede?.nome || 'Workout'}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {new Date(l.data).toLocaleDateString('it-IT')} · {l.durata_minuti} min · {Math.round(l.volume_totale_kg)} kg totali
              </div>
            </div>
            <span className="badge badge-green">✓</span>
          </div>
          {l.note && <div style={{ fontSize: 13, color: '#555', marginTop: 8, fontStyle: 'italic' }}>"{l.note}"</div>}
        </div>
      ))}
    </div>
  )
}

function calcolaSettimana(logs) {
  if (logs.length === 0) return 1
  const primo = new Date(logs[logs.length - 1]?.data)
  const oggi = new Date()
  return Math.ceil((oggi - primo) / (7 * 24 * 3600 * 1000)) || 1
}

function calcolaAderenza(logs) {
  if (logs.length === 0) return 0
  const settimane = calcolaSettimana(logs)
  return Math.min(100, Math.round((logs.length / (settimane * 3)) * 100))
}

function getIcon(nome) {
  const n = (nome || '').toLowerCase()
  if (n.includes('upper') || n.includes('petto') || n.includes('spalle')) return '💪'
  if (n.includes('lower') || n.includes('gamb') || n.includes('squat')) return '🦵'
  if (n.includes('full') || n.includes('total')) return '🔥'
  if (n.includes('cardio')) return '🏃'
  return '📋'
}
