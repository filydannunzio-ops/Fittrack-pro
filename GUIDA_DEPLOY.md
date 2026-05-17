# 🏋️ FitTrack Pro — Guida al Deploy (Costo: 0€)

## Cosa ottieni
- App web accessibile da qualsiasi browser/telefono
- Account separati per trainer e atleti
- Import schede da Word con AI
- Progressione del carico automatica
- Report post-workout inviato al trainer
- Aggiornamenti scheda in tempo reale

---

## STEP 1 — Crea account Supabase (database + autenticazione GRATIS)

1. Vai su https://supabase.com e clicca **Start for free**
2. Crea un progetto (scegli regione Europe West)
3. Vai su **SQL Editor** e incolla tutto il contenuto di `SUPABASE_SCHEMA.sql` → clicca **Run**
4. Vai su **Settings → API** e copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`
5. Abilita conferma email (opzionale per semplificare i test):
   - **Authentication → Settings → Email** → disabilita "Confirm email" per ora

---

## STEP 2 — Ottieni API key Anthropic (per import Word)

1. Vai su https://console.anthropic.com
2. **API Keys → Create Key**
3. Copia la chiave → `VITE_ANTHROPIC_KEY`

> ⚠️ La chiave Anthropic è esposta nel frontend.
> Per produzione seria, crea una Supabase Edge Function che fa da proxy.
> Per uso personale tra te e il tuo PT è accettabile.

---

## STEP 3 — Pubblica su Vercel (GRATIS)

### Opzione A — Con GitHub (consigliata)

1. Crea account su https://github.com (gratis)
2. Crea un nuovo repository vuoto (es: `fittrack-pro`)
3. Carica tutti i file del progetto:
   ```bash
   cd fittrack
   git init
   git add .
   git commit -m "primo commit"
   git branch -M main
   git remote add origin https://github.com/TUO-USERNAME/fittrack-pro.git
   git push -u origin main
   ```
4. Vai su https://vercel.com → **Add New Project**
5. Importa il repository GitHub
6. Nella sezione **Environment Variables** aggiungi:
   - `VITE_SUPABASE_URL` = il tuo URL Supabase
   - `VITE_SUPABASE_ANON_KEY` = la tua anon key
   - `VITE_ANTHROPIC_KEY` = la tua chiave Anthropic
7. Clicca **Deploy** → in 2 minuti hai l'URL!

### Opzione B — Deploy diretto (senza GitHub)

1. Installa Vercel CLI: `npm install -g vercel`
2. Entra nella cartella: `cd fittrack`
3. Crea `.env.local` con i valori reali (vedi `.env.example`)
4. Esegui: `vercel --prod`
5. Segui le istruzioni → ottieni l'URL

---

## STEP 4 — Primo utilizzo

1. Apri l'URL Vercel
2. Il **trainer** si registra scegliendo "Personal Trainer"
3. L'**atleta** si registra scegliendo "Atleta"
4. Il trainer:
   - Importa un file .docx con la scheda
   - Claude estrae automaticamente gli esercizi
   - Imposta la progressione del carico
   - Assegna la scheda all'atleta
5. L'atleta:
   - Apre la scheda, vede i suggerimenti di carico
   - Inserisce i pesi usati durante il workout
   - Preme "Invia report" → il log viene salvato
6. Il trainer:
   - Vede tutti i report nella dashboard
   - Può modificare la scheda in qualsiasi momento

---

## Aggiornamenti futuri

Ogni volta che modifichi il codice e fai `git push`, Vercel rideploya automaticamente in ~1 minuto.

---

## Limiti del piano gratuito

| Servizio | Limite gratuito |
|----------|----------------|
| Supabase | 500 MB DB, 2 GB bandwidth, auth illimitata |
| Vercel   | 100 GB bandwidth, deploy illimitati |
| Anthropic| Pay per use (~0.003€ per import Word) |

Per un uso personale tra PT e pochi atleti, non raggiungerai mai questi limiti.

---

## Dominio personalizzato (opzionale, gratis)

Su Vercel → **Settings → Domains** → aggiungi un dominio.
Domini gratuiti: usa Freenom (.tk, .ml) o compra un .it da ~10€/anno.
