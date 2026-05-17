import { useState, useEffect } from 'react'
import { supabase, signOut } from '../lib/supabase.js'
import { PROGRESSIONE_TYPES } from '../lib/progressione.js'

export default function TrainerDashboard({ profile }) {
  const [atleti, setAtleti] = useState([])
  const [schede, setSchede] = useState([])
  const [logs, setLogs] = useState([])
  const [view, setView] = useState('dashboard') // dashboard | nuova-scheda | atleta-detail
  const [selectedAtleta, setSelectedAtleta] = useState(null)
  const [loading, setLoading] = useState(true)

  const [nuovaScheda, setNuovaScheda] = useState({
    nome: '', descrizione: '', atleta_id: '', esercizi: []
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: a }, { data: s }, { data: l }] = await Promise.all([
      supabase.from('profiles').select('*').eq('ruolo', 'atleta'),
      supabase.from('schede').select('*').eq('trainer_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('workout_logs').select('*, profiles(nome_completo), schede(nome)').order('data', { ascending: false }).limit(20),
    ])
    setAtleti(a || [])
    setSchede(s || [])
    setLogs(l || [])
    setLoading(false)
  }

  function addEsercizio() {
    setNuovaScheda(prev => ({
      ...prev,
      esercizi: [...prev.esercizi, {
        id: Date.now(), nome: '', serie: 3, ripetizioni: '10',
        recupero_secondi: 90, peso_iniziale_kg: 0, spiegazione: '', muscoli: '',
        note: '', progressione: { tipo: PROGRESSIONE_TYPES.LINEARE, incremento: 2.5, ogni_settimane: 1 }
      }]
    }))
  }

  function updateEsercizio(id, field, value) {
    setNuovaScheda(prev => ({
      ...prev,
      esercizi: prev.esercizi.map(e => e.id === id ? { ...e, [field]: value } : e)
    }))
  }

  function updateProgressione(id, field, value) {
    setNuovaScheda(prev => ({
      ...prev,
      esercizi: prev.esercizi.map(e => e.id === id ? { ...e, progressione: { ...e.progressione, [field]: value } } : e)
    }))
  }

  function removeEsercizio(id) {
    setNuovaScheda(prev => ({ ...prev, esercizi: prev.esercizi.filter(e => e.id !== id) }))
  }

  async function salvaScheda() {
    if (!nuovaScheda.nome || !nuovaScheda.atleta_id) {
      alert('Inserisci nome scheda e atleta')
      return
    }
    const { error } = await supabase.from('schede').insert({
      trainer_id: profile.id,
      atleta_id: nuovaScheda.atleta_id,
      nome: nuovaScheda.nome,
      descrizione: nuovaScheda.descrizione,
      esercizi: nuovaScheda.esercizi,
      attiva: true,
      versione: 1,
    })
    if (error) { alert('Errore: ' + error.message); return }
    alert('✅ Scheda salvata!')
    setNuovaScheda({ nome: '', descrizione: '', atleta_id: '', esercizi: [] })
    setView('dashboard')
    fetchData()
  }

  async function aggiornaScheda(schedaId, campi) {
    await supabase.from('schede').update({ ...campi, versione: supabase.rpc('increment', { x: 1 }) }).eq('id', schedaId)
    fetchData()
  }

  if (loading) return <div className="app-shell" style={{ padding: '40px 0', textAlign: 'center', color: '#888' }}>Caricamento...</div>

  return (
    <div className="app-shell" style={{ paddingTop: 16, paddingBottom: 40 }}>
      <div className="app-header">
        <div className="logo">
          <div className="logo-icon">💪</div>
          FitTrack Pro
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge-role">👨‍🏫 Trainer</span>
          <button className="btn-logout" onClick={signOut}>Esci</button>
        </div>
      </div>

      {view === 'dashboard' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-val">{atleti.length}</div><div className="stat-lbl">Atleti</div></div>
            <div className="stat-card"><div className="stat-val">{schede.length}</div><div className="stat-lbl">Schede attive</div></div>
            <div className="stat-card"><div className="stat-val">{logs.length}</div><div className="stat-lbl">Workout ricevuti</div></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
            <p className="section-title" style={{ margin: 0 }}>Schede create</p>
            <button className="btn btn-primary btn-sm" onClick={() => setView('nuova-scheda')}>+ Nuova scheda</button>
          </div>

          {schede.length === 0 && <div className="card" style={{ color: '#888', textAlign: 'center' }}>Nessuna scheda ancora. Importa un Word o creane una.</div>}
          {schede.map(s => {
            const atleta = atleti.find(a => a.id === s.atleta_id)
            return (
              <div key={s.id} className="card card-clickable scheda-item" onClick={() => { setSelectedAtleta(s); setView('modifica-scheda') }}>
                <div className="scheda-item-icon">📋</div>
                <div className="scheda-item-info">
                  <div className="scheda-item-title">{s.nome}</div>
                  <div className="scheda-item-sub">{atleta?.nome_completo || '—'} · {s.esercizi?.length || 0} esercizi · v{s.versione || 1}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge ${s.attiva ? 'badge-green' : 'badge-gray'}`}>{s.attiva ? 'Attiva' : 'Inattiva'}</span>
                  <span className="scheda-item-arrow">›</span>
                </div>
              </div>
            )
          })}

          <p className="section-title" style={{ marginTop: 24 }}>Ultimi report ricevuti</p>
          {logs.length === 0 && <div className="card" style={{ color: '#888', textAlign: 'center' }}>Nessun workout ancora completato.</div>}
          {logs.slice(0, 5).map(l => (
            <div key={l.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{l.profiles?.nome_completo} — {l.schede?.nome}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                    {new Date(l.data).toLocaleDateString('it-IT')} · {l.durata_minuti} min · Vol. {Math.round(l.volume_totale_kg)} kg
                  </div>
                  {l.note && <div style={{ fontSize: 13, color: '#555', marginTop: 6, fontStyle: 'italic' }}>"{l.note}"</div>}
                </div>
                <span className="badge badge-green">✓</span>
              </div>
            </div>
          ))}
        </>
      )}

      {view === 'nuova-scheda' && (
        <SchedaBuilder
          nuovaScheda={nuovaScheda}
          setNuovaScheda={setNuovaScheda}
          atleti={atleti}
          addEsercizio={addEsercizio}
          updateEsercizio={updateEsercizio}
          updateProgressione={updateProgressione}
          removeEsercizio={removeEsercizio}
          onSave={salvaScheda}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'modifica-scheda' && selectedAtleta && (
        <ModificaScheda
          scheda={selectedAtleta}
          atleti={atleti}
          onSave={(id, dati) => { aggiornaScheda(id, dati); setView('dashboard') }}
          onBack={() => setView('dashboard')}
        />
      )}
    </div>
  )
}

function SchedaBuilder({ nuovaScheda, setNuovaScheda, atleti, addEsercizio, updateEsercizio, updateProgressione, removeEsercizio, onSave, onBack }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Indietro</button>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Nuova scheda</h2>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Nome scheda</label>
          <input type="text" value={nuovaScheda.nome} onChange={e => setNuovaScheda(p => ({ ...p, nome: e.target.value }))} placeholder="Es: Scheda A — Upper Body" />
        </div>
        <div className="form-group">
          <label>Descrizione (opzionale)</label>
          <textarea value={nuovaScheda.descrizione} onChange={e => setNuovaScheda(p => ({ ...p, descrizione: e.target.value }))} placeholder="Obiettivi e note generali..." />
        </div>
        <div className="form-group">
          <label>Assegna a</label>
          <select value={nuovaScheda.atleta_id} onChange={e => setNuovaScheda(p => ({ ...p, atleta_id: e.target.value }))}>
            <option value="">— Seleziona atleta —</option>
            {atleti.map(a => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="section-title" style={{ margin: 0 }}>Esercizi ({nuovaScheda.esercizi.length})</p>
        <button className="btn btn-secondary btn-sm" onClick={addEsercizio}>+ Aggiungi</button>
      </div>

      {nuovaScheda.esercizi.map((ex, idx) => (
        <EsercizioEditor key={ex.id} ex={ex} idx={idx} update={updateEsercizio} updateProg={updateProgressione} remove={removeEsercizio} />
      ))}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onSave}>💾 Salva scheda</button>
        <button className="btn btn-secondary" onClick={onBack}>Annulla</button>
      </div>
    </>
  )
}

function EsercizioEditor({ ex, idx, update, updateProg, remove }) {
  const [open, setOpen] = useState(idx === 0)
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span style={{ fontWeight: 500, flex: 1 }}>{ex.nome || `Esercizio ${idx + 1}`}</span>
        <span className="badge badge-gray">{ex.serie}×{ex.ripetizioni}</span>
        <span style={{ color: '#bbb' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome esercizio</label>
              <input value={ex.nome} onChange={e => update(ex.id, 'nome', e.target.value)} placeholder="Panca Piana" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Serie</label>
              <input type="number" value={ex.serie} onChange={e => update(ex.id, 'serie', +e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ripetizioni</label>
              <input value={ex.ripetizioni} onChange={e => update(ex.id, 'ripetizioni', e.target.value)} placeholder="8-10" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Recupero (s)</label>
              <input type="number" value={ex.recupero_secondi} onChange={e => update(ex.id, 'recupero_secondi', +e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Spiegazione esecuzione</label>
            <textarea value={ex.spiegazione} onChange={e => update(ex.id, 'spiegazione', e.target.value)} placeholder="Come eseguire l'esercizio correttamente..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Muscoli coinvolti</label>
              <input value={ex.muscoli} onChange={e => update(ex.id, 'muscoli', e.target.value)} placeholder="Petto, Tricipiti" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Peso iniziale (kg)</label>
              <input type="number" step="0.5" value={ex.peso_iniziale_kg} onChange={e => update(ex.id, 'peso_iniziale_kg', +e.target.value)} />
            </div>
          </div>

          <hr className="divider" />
          <p style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Progressione del carico</p>
          <div className="prog-selector" style={{ marginBottom: 12 }}>
            {[
              { key: PROGRESSIONE_TYPES.LINEARE, label: '📈 Lineare' },
              { key: PROGRESSIONE_TYPES.PERCENTUALE, label: '% Percentuale' },
              { key: PROGRESSIONE_TYPES.DOPPIA_PROGRESSIONE, label: '🔄 Doppia progressione' },
            ].map(p => (
              <div key={p.key} className={`prog-pill ${ex.progressione?.tipo === p.key ? 'active' : ''}`} onClick={() => updateProg(ex.id, 'tipo', p.key)}>{p.label}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>+kg ogni aumento</label>
              <input type="number" step="0.5" value={ex.progressione?.incremento || 2.5} onChange={e => updateProg(ex.id, 'incremento', +e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Ogni N settimane</label>
              <input type="number" min="1" value={ex.progressione?.ogni_settimane || 1} onChange={e => updateProg(ex.id, 'ogni_settimane', +e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button className="btn btn-danger btn-sm" onClick={() => remove(ex.id)}>🗑 Rimuovi</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModificaScheda({ scheda, atleti, onSave, onBack }) {
  const [dati, setDati] = useState({ ...scheda })

  function updateEsercizio(id, field, value) {
    setDati(prev => ({ ...prev, esercizi: prev.esercizi.map(e => e.id === id ? { ...e, [field]: value } : e) }))
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>← Indietro</button>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Modifica: {scheda.nome}</h2>
      </div>

      <div className="alert alert-info">
        ℹ️ Le modifiche sono immediate — l'atleta vedrà la versione aggiornata al prossimo accesso.
      </div>

      <div className="card">
        <div className="form-group">
          <label>Nome scheda</label>
          <input value={dati.nome} onChange={e => setDati(p => ({ ...p, nome: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Descrizione</label>
          <textarea value={dati.descrizione} onChange={e => setDati(p => ({ ...p, descrizione: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Scheda attiva</label>
          <select value={dati.attiva ? 'si' : 'no'} onChange={e => setDati(p => ({ ...p, attiva: e.target.value === 'si' }))}>
            <option value="si">✅ Attiva — visibile all'atleta</option>
            <option value="no">⏸ Inattiva — nascosta all'atleta</option>
          </select>
        </div>
      </div>

      <p className="section-title">Esercizi</p>
      {dati.esercizi?.map((ex, idx) => (
        <div key={ex.id || idx} className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Esercizio</label>
              <input value={ex.nome} onChange={e => updateEsercizio(ex.id, 'nome', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Serie</label>
              <input type="number" value={ex.serie} onChange={e => updateEsercizio(ex.id, 'serie', +e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Rip.</label>
              <input value={ex.ripetizioni} onChange={e => updateEsercizio(ex.id, 'ripetizioni', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Peso target (kg)</label>
              <input type="number" step="0.5" value={ex.peso_iniziale_kg} onChange={e => updateEsercizio(ex.id, 'peso_iniziale_kg', +e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
            <label>Spiegazione / note</label>
            <textarea value={ex.spiegazione} onChange={e => updateEsercizio(ex.id, 'spiegazione', e.target.value)} style={{ minHeight: 60 }} />
          </div>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={() => onSave(dati.id, dati)}>💾 Salva modifiche</button>
        <button className="btn btn-secondary" onClick={onBack}>Annulla</button>
      </div>
    </>
  )
}
