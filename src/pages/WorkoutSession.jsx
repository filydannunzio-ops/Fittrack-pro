import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { calcolaCarico, getSuggerimentoSettimana } from '../lib/progressione.js'

export default function WorkoutSession({ profile }) {
  const { schedaId } = useParams()
  const navigate = useNavigate()
  const [scheda, setScheda] = useState(null)
  const [logs, setLogs] = useState([])
  const [sessione, setSessione] = useState({}) // { [exId]: [{ peso, rip_effettuate }] }
  const [note, setNote] = useState('')
  const [timer, setTimer] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const [recupero, setRecupero] = useState({ on: false, secondi: 0, max: 90 })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const timerRef = useRef()
  const recRef = useRef()

  const settimana = calcolaSettimanaAttuale(logs)

  useEffect(() => {
    async function fetch() {
      const [{ data: s }, { data: l }] = await Promise.all([
        supabase.from('schede').select('*').eq('id', schedaId).single(),
        supabase.from('workout_logs').select('*').eq('atleta_id', profile.id).eq('scheda_id', schedaId).order('data', { ascending: false }).limit(10),
      ])
      setScheda(s)
      setLogs(l || [])
      if (s?.esercizi) {
        const init = {}
        s.esercizi.forEach(ex => {
          const id = ex.id || ex.nome
          init[id] = Array.from({ length: ex.serie }, () => ({
            peso: calcolaCarico(ex, settimana),
            rip_effettuate: ''
          }))
        })
        setSessione(init)
      }
      setLoading(false)
    }
    fetch()
  }, [schedaId])

  useEffect(() => {
    if (timerOn) timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  useEffect(() => {
    if (recupero.on && recupero.secondi > 0) {
      recRef.current = setInterval(() => setRecupero(r => ({ ...r, secondi: r.secondi - 1 })), 1000)
    } else if (recupero.secondi === 0 && recupero.on) {
      clearInterval(recRef.current)
      setRecupero(r => ({ ...r, on: false }))
    }
    return () => clearInterval(recRef.current)
  }, [recupero.on, recupero.secondi])

  function updateSet(exId, setIdx, field, value) {
    setSessione(prev => {
      const sets = [...(prev[exId] || [])]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      return { ...prev, [exId]: sets }
    })
  }

  function startRecupero(secondi) {
    clearInterval(recRef.current)
    setRecupero({ on: true, secondi, max: secondi })
  }

  async function inviaReport() {
    setSending(true)
    const esercizi_log = scheda.esercizi.map(ex => {
      const id = ex.id || ex.nome
      return { nome: ex.nome, sets: sessione[id] || [] }
    })
    const volume = esercizi_log.reduce((t, ex) => t + ex.sets.reduce((s, set) => s + (parseFloat(set.peso) || 0) * (parseInt(set.rip_effettuate) || 0), 0), 0)

    const { error } = await supabase.from('workout_logs').insert({
      atleta_id: profile.id,
      scheda_id: schedaId,
      durata_minuti: Math.round(timer / 60),
      data: new Date().toISOString(),
      esercizi_log,
      note,
      volume_totale_kg: Math.round(volume),
    })

    if (!error) {
      // Notifica al trainer (Edge Function opzionale)
      await supabase.functions.invoke('notifica-trainer', {
        body: {
          atleta: profile.nome_completo,
          scheda: scheda.nome,
          volume: Math.round(volume),
          durata: Math.round(timer / 60),
          note,
        }
      }).catch(() => {}) // non bloccante
      setSent(true)
      setTimerOn(false)
    }
    setSending(false)
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (loading) return <div className="app-shell" style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>Caricamento scheda...</div>
  if (!scheda) return <div className="app-shell" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Scheda non trovata.</div>

  if (sent) return (
    <div className="app-shell" style={{ paddingTop: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Workout completato!</h2>
      <p style={{ color: '#888', marginBottom: 4 }}>Report inviato al tuo trainer.</p>
      <p style={{ color: '#888', marginBottom: 24 }}>Ottimo lavoro oggi — continua così!</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>← Torna alla home</button>
    </div>
  )

  const ultimoLog = logs[0]

  return (
    <div className="app-shell" style={{ paddingTop: 16, paddingBottom: 60 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>← Indietro</button>
        <h2 style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{scheda.nome}</h2>
        <span className="badge badge-blue">Sett. {settimana}</span>
      </div>

      <div className="timer-bar">
        <div>
          <div className="timer-label">Durata workout</div>
          <div className="timer-display">{fmt(timer)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setTimerOn(!timerOn)}>
            {timerOn ? '⏸ Pausa' : '▶ Start'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { setTimer(0); setTimerOn(false) }}>↺</button>
        </div>
      </div>

      {recupero.on && (
        <div className="alert alert-warning" style={{ justifyContent: 'space-between' }}>
          <span>⏱ Recupero: <strong>{fmt(recupero.secondi)}</strong></span>
          <div className="progress-bar" style={{ flex: 1, margin: '0 12px' }}>
            <div className="progress-fill" style={{ width: `${Math.round(((recupero.max - recupero.secondi) / recupero.max) * 100)}%` }} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { clearInterval(recRef.current); setRecupero(r => ({ ...r, on: false })) }}>Skip</button>
        </div>
      )}

      {scheda.esercizi?.map((ex, idx) => {
        const id = ex.id || ex.nome
        const sets = sessione[id] || []
        const ultimoExLog = ultimoLog?.esercizi_log?.find(e => e.nome === ex.nome)
        const suggerimenti = getSuggerimentoSettimana(ex, settimana, ultimoExLog?.sets?.[0])

        return (
          <div key={id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{ex.nome}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {ex.serie} serie · {ex.ripetizioni} rip · recupero {ex.recupero_secondi}s
                  {ex.muscoli && ` · ${ex.muscoli}`}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => startRecupero(ex.recupero_secondi)}>⏱ Recupero</button>
            </div>

            {suggerimenti.length > 0 && (
              <div className="alert alert-info" style={{ marginBottom: 10, fontSize: 13 }}>
                {suggerimenti[0]}
              </div>
            )}

            {ex.spiegazione && (
              <details style={{ marginBottom: 10 }}>
                <summary style={{ fontSize: 12, color: '#1D9E75', cursor: 'pointer', userSelect: 'none' }}>📖 Come eseguire</summary>
                <div style={{ fontSize: 13, color: '#555', marginTop: 8, padding: '8px', background: '#f8faf9', borderRadius: 6, lineHeight: 1.6 }}>
                  {ex.spiegazione}
                </div>
              </details>
            )}

            <table className="sets-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>Set</th>
                  <th>Precedente</th>
                  <th>Peso (kg)</th>
                  <th>Rip.</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((set, i) => {
                  const prevSet = ultimoExLog?.sets?.[i]
                  return (
                    <tr key={i}>
                      <td><span className="set-num">{i + 1}</span></td>
                      <td style={{ fontSize: 12, color: '#999' }}>
                        {prevSet ? `${prevSet.peso}kg × ${prevSet.rip_effettuate}` : '—'}
                      </td>
                      <td>
                        <input
                          type="number" step="0.5" min="0"
                          value={set.peso}
                          onChange={e => updateSet(id, i, 'peso', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number" min="0"
                          value={set.rip_effettuate}
                          onChange={e => updateSet(id, i, 'rip_effettuate', e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <div className="form-group">
        <label>Note per il trainer (opzionale)</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Come ti sei sentito? Dolori? Commenti sugli esercizi..." />
      </div>

      <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }} onClick={inviaReport} disabled={sending}>
        {sending ? 'Invio in corso...' : '✅ Completa e invia report al trainer'}
      </button>
    </div>
  )
}

function calcolaSettimanaAttuale(logs) {
  if (!logs || logs.length === 0) return 1
  const primo = new Date(logs[logs.length - 1]?.data)
  const oggi = new Date()
  return Math.max(1, Math.ceil((oggi - primo) / (7 * 24 * 3600 * 1000)))
}
