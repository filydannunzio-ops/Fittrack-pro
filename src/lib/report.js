import { supabase } from './supabase.js'

export async function inviaReportPT(workoutData, atleta, trainer) {
  // Salva il workout nel DB
  const { data: workout, error } = await supabase
    .from('workout_logs')
    .insert({
      atleta_id: atleta.id,
      scheda_id: workoutData.scheda_id,
      durata_minuti: workoutData.durata_minuti,
      data: new Date().toISOString(),
      esercizi_log: workoutData.esercizi,
      note: workoutData.note,
      volume_totale_kg: calcolaVolume(workoutData.esercizi),
    })
    .select()
    .single()

  if (error) throw error

  // Chiama Edge Function per inviare email
  await supabase.functions.invoke('invia-report', {
    body: {
      workout_id: workout.id,
      trainer_email: trainer.email,
      atleta_nome: atleta.nome_completo,
      scheda_nome: workoutData.scheda_nome,
      data: new Date().toLocaleDateString('it-IT'),
      durata: workoutData.durata_minuti,
      volume: calcolaVolume(workoutData.esercizi),
      esercizi: workoutData.esercizi,
      note: workoutData.note,
    }
  })

  return workout
}

function calcolaVolume(esercizi) {
  return esercizi.reduce((tot, ex) => {
    return tot + ex.sets.reduce((s, set) => s + (set.peso || 0) * (set.rip_effettuate || 0), 0)
  }, 0)
}
