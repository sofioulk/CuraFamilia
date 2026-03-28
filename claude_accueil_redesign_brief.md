# Prompt for Claude - Redesign Accueil (Senior Dashboard) without breaking backend

You are redesigning the **Accueil page for the Senior app** in an existing React project.

Goal: produce a more polished, studied, modern mobile-first design, while keeping full compatibility with current backend and behavior.

## 1) Project context

- Frontend stack: React (JS), inline style-heavy UI, mobile container.
- Current Accueil screen file:
  - `src/screens/senior/ElderDashboard.jsx`
- Shared UI components used by this page:
  - `src/components/ui/Phone.jsx`
  - `src/components/senior/MedCard.jsx`
  - `src/components/senior/AppointmentCard.jsx`
  - `src/components/senior/BottomNav.jsx`
  - `src/components/ui/PrimaryBtn.jsx`
  - `src/components/ui/GhostBtn.jsx`
  - `src/components/ui/TextBtn.jsx`
  - `src/components/icons/Icons.jsx`
  - `src/styles/theme.js`
  - `src/styles/globalStyles.js`
- API service used by this page:
  - `src/services/homeApi.js`

## 2) Scope

Redesign the Accueil UI only (Senior Dashboard), but **do not change backend contract** and do not remove key functional blocks:

1. Greeting + date
2. Next medication card + "Je l'ai pris" action
3. Daily assistant checkin question + answer actions
4. Medication list of the day
5. Next appointment card
6. SOS emergency section with cooldown behavior
7. Bottom navigation

## 3) Non-negotiable constraints

- Keep all existing API calls and payload field names compatible.
- Keep existing business logic behavior:
  - medication take flow
  - checkin submission flow
  - SOS active/cooldown/reactivation flow
  - loading/error/empty states
- Keep navigation behavior:
  - `onNavigate("dashboard" | "medications" | "assistant" | "profile")`
- Keep `Phone` wrapper usage for mobile layout.
- Do not add new npm dependencies.
- Do not modify backend Java code.

## 4) Backend contracts to respect exactly

### GET `/senior/home?seniorId={id}[&date=YYYY-MM-DD]`

Expected response shape:

```json
{
  "senior": { "id": 1, "name": "Fatima" },
  "date": { "iso": "2026-03-14", "label": "Samedi 14 mars 2026" },
  "nextMedication": {
    "medicationId": 2,
    "name": "Aspirine",
    "dosage": "100 mg",
    "time": "13:00",
    "scheduledAt": "2026-03-14T13:00:00",
    "status": "pending",
    "countdownMinutes": 15,
    "countdownText": "Dans 15 min"
  },
  "dailyQuestion": {
    "question": "Avez-vous bien dormi cette nuit ?",
    "options": ["Oui", "Un peu", "Non"],
    "latestAnswer": "Oui",
    "latestAnsweredAt": "2026-03-14T08:10:00"
  },
  "medications": [
    {
      "id": 2,
      "name": "Aspirine",
      "dosage": "100 mg",
      "time": "13:00",
      "frequency": "Quotidien",
      "period": "midi",
      "instruction": "Apres repas",
      "status": "pending",
      "scheduledAt": "2026-03-14T13:00:00",
      "takenAt": null
    }
  ],
  "nextAppointment": {
    "id": 11,
    "specialty": "Cardiologie",
    "appointmentAt": "2026-03-17T10:30:00",
    "doctorName": "Dr X",
    "notes": "Controle",
    "status": "scheduled"
  },
  "latestSosAlert": {
    "id": 99,
    "status": "triggered",
    "triggeredAt": "2026-03-14T11:50:00",
    "comment": "Douleur thoracique"
  }
}
```

### POST `/senior/home/medications/{medicationId}/take`

Request body:

```json
{
  "seniorId": 1,
  "scheduledAt": "2026-03-14T13:00:00",
  "takenAt": "2026-03-14T12:58:00"
}
```

Response:

```json
{
  "message": "Prise enregistree.",
  "take": {
    "medicationId": 2,
    "seniorId": 1,
    "scheduledAt": "2026-03-14T13:00:00",
    "takenAt": "2026-03-14T12:58:00",
    "status": "taken"
  }
}
```

### POST `/senior/home/checkins`

Request body:

```json
{
  "seniorId": 1,
  "question": "Avez-vous bien dormi cette nuit ?",
  "answer": "Oui"
}
```

Response:

```json
{
  "message": "Reponse enregistree.",
  "checkin": {
    "seniorId": 1,
    "question": "Avez-vous bien dormi cette nuit ?",
    "answer": "Oui",
    "answeredAt": "2026-03-14T08:10:00"
  }
}
```

### POST `/senior/home/sos`

Request body:

```json
{
  "seniorId": 1,
  "comment": "Alerte declenchee depuis l'accueil."
}
```

Response:

```json
{
  "message": "Alerte SOS declenchee.",
  "alert": {
    "id": 99,
    "seniorId": 1,
    "status": "triggered",
    "triggeredAt": "2026-03-14T11:50:00",
    "comment": "Alerte declenchee depuis l'accueil."
  },
  "alreadyActive": false
}
```

## 5) UI/UX direction (design quality target)

- Make the page feel intentionally designed (not generic).
- Keep a health-care reassuring tone: clean, calm, trustable, clear hierarchy.
- Improve spacing rhythm and card hierarchy.
- Use strong visual prioritization:
  - primary action: next medication take
  - emergency action: SOS (high visibility but controlled)
  - secondary action: daily checkin
- Improve legibility for seniors:
  - generous tap targets
  - clear contrast
  - concise copy blocks
  - predictable visual grouping
- Keep it mobile-first and robust on small devices.

## 6) Functional behavior that must remain

- If `nextMedication` exists, show main action button to confirm take.
- If no remaining medication, show completion or empty message.
- Checkin options:
  - show options from `dailyQuestion.options`
  - disable/lock when already answered
- SOS:
  - disable while active cooldown (10 minutes)
  - show countdown feedback
  - allow reactivation after cooldown
- Always preserve loading/error feedback text.

## 7) Technical implementation rules

- Main file to redesign: `src/screens/senior/ElderDashboard.jsx`
- You may make small supportive style updates in shared components if needed, but avoid broad refactors.
- Keep imports and service calls from `homeApi.js` intact.
- Keep state names and handlers compatible unless clearly improved without behavior change.
- No new libraries.

## 8) Output expected from Claude

Return:

1. Updated code for `src/screens/senior/ElderDashboard.jsx`
2. Any additional changed files (only if necessary)
3. Short explanation of design decisions
4. Confirmation checklist proving backend compatibility was preserved

## 9) Acceptance checklist

- Compiles without adding dependencies
- Uses existing endpoints exactly as before
- No backend payload key renamed
- Keeps all actions working:
  - mark medication taken
  - submit checkin
  - trigger/retrigger SOS
- Keeps bottom nav and screen navigation working
- Improved visual quality and readability on mobile

