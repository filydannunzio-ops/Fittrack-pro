// Logic for progressive overload — PT sets rules, app applies automatically

export const PROGRESSIONE_TYPES = {
  LINEARE: 'lineare',           // +X kg ogni N settimane
  PERCENTUALE: 'percentuale',   // +X% ogni N settimane
  DOPPIA_PROGRESSIONE: 'doppia' // prima aumenta rip, poi peso
}

export function calcolaCarico(esercizio, settimana) {
  const { peso_iniziale_kg, progressione } = esercizio
  if (!progressione) return peso_iniziale_kg || 0

  const { tipo, incremento, ogni_settimane, max_rip_prima_aumento } = progressione
  const ciclo = Math.floor((settimana - 1) / (ogni_settimane || 1))

  switch (tipo) {
    case PROGRESSIONE_TYPES.LINEARE: {
      return Math.round((peso_iniziale_kg + ciclo * incremento) * 2) / 2
    }
    case PROGRESSIONE_TYPES.PERCENTUALE: {
      return Math.round(peso_iniziale_kg * Math.pow(1 + incremento / 100, ciclo) * 2) / 2
    }
    case PROGRESSIONE_TYPES.DOPPIA_PROGRESSIONE: {
      return peso_iniziale_kg + Math.floor(ciclo / (max_rip_prima_aumento || 2)) * incremento
    }
    default:
      return peso_iniziale_kg || 0
  }
}

export function getSuggerimentoSettimana(esercizio, settimana, ultimoWorkout) {
  const caricoTarget = calcolaCarico(esercizio, settimana)
  const msgs = []

  if (ultimoWorkout) {
    const { peso_usato, ripetizioni_effettuate } = ultimoWorkout
    if (caricoTarget > peso_usato) {
      msgs.push(`🎯 Questa settimana prova ad aumentare a ${caricoTarget} kg (+${caricoTarget - peso_usato} kg rispetto all'ultima volta)`)
    } else if (ripetizioni_effettuate && esercizio.ripetizioni) {
      const [, maxRip] = esercizio.ripetizioni.toString().split('-').map(Number)
      if (ripetizioni_effettuate >= maxRip) {
        msgs.push(`✅ Hai raggiunto le rip. massime! Il PT ha previsto un aumento di carico la prossima settimana`)
      }
    }
  } else {
    msgs.push(`Inizia con ${caricoTarget} kg — peso target per la settimana ${settimana}`)
  }

  return msgs
}
