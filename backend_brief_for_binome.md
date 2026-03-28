# CuraFamilia - Brief Backend (pour binôme)

## 1) Titre du projet
**CuraFamilia**

## 2) Description courte
CuraFamilia est une application de suivi médical pour personnes âgées, avec un espace famille pour superviser les prises de médicaments, les rendez-vous, les échanges chatbot et les alertes SOS.

## 3) Utilisateurs principaux
- `senior`
- `famille` (membre de la famille)

## 4) Fonctionnalités principales par utilisateur
### Senior
- Voir ses médicaments du jour
- Marquer un médicament comme pris
- Voir son prochain rendez-vous
- Répondre aux questions du chatbot
- Discuter avec l'assistant IA
- Déclencher une alerte SOS

### Famille
- Suivre les prises de médicaments du senior
- Consulter le prochain rendez-vous
- Recevoir les retours chatbot / état quotidien
- Recevoir les alertes SOS

## 5) Répartition technique
- Frontend: **React JS**
- Backend: **Java**
- Base de données: **MySQL**

## 6) Note importante sur les rôles
Utiliser **uniquement** les rôles suivants:
- `famille`
- `senior`

Ne pas ajouter d'autres rôles (ex: admin) pour éviter de casser l'intégration frontend.

## 7) Modules backend à démarrer en priorité
1. Authentication
2. Senior Home (dashboard agrégé)
3. Medications
4. Appointments
5. Assistant (Chatbot)
6. SOS

## 8) Entités base de données suggérées
- `users`
  - `id`, `name`, `email` (unique), `password_hash`, `role` (`famille|senior`), `phone`, `created_at`
- `family_senior_links`
  - `id`, `family_user_id`, `senior_user_id`, `created_at`
- `medications`
  - `id`, `senior_id`, `name`, `dosage`, `time`, `frequency`, `period`, `instruction`, `active`
- `medication_takes`
  - `id`, `medication_id`, `senior_id`, `taken_at`, `status` (`taken|missed|pending`)
- `appointments`
  - `id`, `senior_id`, `specialty`, `appointment_at`, `doctor_name`, `notes`
- `chatbot_sessions`
  - `id`, `senior_id`, `date`
- `chatbot_messages`
  - `id`, `session_id`, `sender` (`bot|senior`), `message`, `created_at`
- `chatbot_daily_summaries`
  - `id`, `senior_id`, `summary_date`, `summary_text`, `created_at`
- `daily_checkins`
  - `id`, `senior_id`, `question`, `answer`, `created_at`
- `password_reset_tokens`
  - `id`, `user_id`, `token`, `expires_at`
- `sos_alerts`
  - `id`, `senior_id`, `triggered_at`, `status`, `comment`

## 9) Contrat API — Endpoints exacts

> **⚠️ IMPORTANT:** Les chemins ci-dessous sont les chemins **exacts** que le frontend appelle. Le backend **doit** implémenter ces chemins tels quels, sinon le frontend ne fonctionnera pas.

---

### 9.1) Authentification

#### POST `/auth/login`
Request:
```json
{
  "email": "demo@curafamilia.ma",
  "password": "demo123"
}
```
Response 200:
```json
{
  "user": {
    "id": "u_123",
    "name": "Sofia Famille",
    "email": "demo@curafamilia.ma",
    "role": "famille"
  },
  "token": "jwt_or_session_token"
}
```

#### POST `/auth/register`
Request:
```json
{
  "name": "Fatima Benali",
  "email": "fatima@example.com",
  "phone": "+212600000000",
  "role": "senior",
  "password": "secret123"
}
```
Response 201:
```json
{
  "user": {
    "id": "u_456",
    "name": "Fatima Benali",
    "email": "fatima@example.com",
    "role": "senior"
  },
  "token": "jwt_or_session_token"
}
```

#### POST `/auth/forgot-password`
Request:
```json
{
  "email": "fatima@example.com"
}
```
Response 200:
```json
{
  "message": "Reset link sent."
}
```

---

### 9.2) Senior Home (Dashboard agrégé)

> Ce endpoint est le **point d'entrée principal** du dashboard senior. Il retourne toutes les données nécessaires en un seul appel.

#### GET `/senior/home?seniorId={id}`
Paramètres query:
- `seniorId` (obligatoire) — ID du senior
- `date` (optionnel) — Date au format `YYYY-MM-DD`, par défaut aujourd'hui

Response 200:
```json
{
  "senior": {
    "name": "Fatima Benali"
  },
  "medications": [
    {
      "id": "m_1",
      "name": "Aspirine",
      "dosage": "100 mg",
      "time": "08:00",
      "frequency": "Tous les jours",
      "period": "Matin",
      "instruction": "Prendre après le petit déjeuner.",
      "status": "taken",
      "takenAt": "2026-03-27T08:05:00Z"
    },
    {
      "id": "m_2",
      "name": "Doliprane",
      "dosage": "500 mg",
      "time": "14:00",
      "frequency": "Tous les jours",
      "period": "Midi",
      "instruction": "",
      "status": "pending",
      "takenAt": null
    }
  ],
  "nextMedication": {
    "medicationId": "m_2",
    "scheduledAt": "2026-03-27T14:00:00Z",
    "name": "Doliprane",
    "dosage": "500 mg",
    "time": "14:00",
    "countdownText": "Dans 2h"
  },
  "dailyQuestions": [
    {
      "question": "Avez-vous bien dormi cette nuit ?",
      "options": ["Oui", "Pas vraiment", "Non"],
      "latestAnswer": ""
    },
    {
      "question": "Avez-vous ressenti des effets indésirables ?",
      "options": ["Non", "Lesquels ?"],
      "latestAnswer": ""
    }
  ],
  "nextAppointment": {
    "id": "a_1",
    "specialty": "Cardiologie",
    "appointmentAt": "2026-03-28T10:00:00Z",
    "doctorName": "Dr. Alaoui"
  },
  "latestSosAlert": null
}
```

> **Notes:**
> - `nextMedication` est `null` si toutes les prises du jour sont complétées.
> - `dailyQuestions` est un tableau (max 2 questions). `latestAnswer` est vide si pas encore répondu.
> - `latestSosAlert` contient la dernière alerte SOS ou `null` si aucune.
> - `nextAppointment` est `null` si aucun rendez-vous à venir.

---

### 9.3) Médicaments

#### GET `/senior/medications?seniorId={id}&period={period}`
Paramètres query:
- `seniorId` (obligatoire) — ID du senior
- `period` (obligatoire) — `all`, `matin`, `midi`, `soir`, ou `ponctuel`

Response 200:
```json
{
  "count": 4,
  "takenCount": 2,
  "period": "all",
  "medications": [
    {
      "id": "m_1",
      "name": "Aspirine",
      "dosage": "100 mg",
      "time": "08:00",
      "frequency": "Tous les jours",
      "period": "Matin",
      "instruction": "Prendre après le petit déjeuner.",
      "status": "taken",
      "takenAt": "2026-03-27T08:05:00Z",
      "active": true
    }
  ]
}
```

> **Note:** Si ce endpoint n'est pas encore déployé (retourne 404), le frontend se rabat automatiquement sur `/senior/home` pour récupérer les médicaments. Vous pouvez donc développer cet endpoint en second temps.

#### POST `/senior/home/medications/{medicationId}/take`
Request:
```json
{
  "seniorId": "u_456",
  "scheduledAt": "2026-03-27T08:00:00Z",
  "takenAt": "2026-03-27T08:05:00Z"
}
```
Response 200:
```json
{
  "id": "m_1",
  "status": "taken",
  "takenAt": "2026-03-27T08:05:00Z"
}
```

> **Note:** `takenAt` peut être `null` dans la request — le backend doit alors utiliser l'heure actuelle.

---

### 9.4) Check-in quotidien

#### POST `/senior/home/checkins`
Request:
```json
{
  "seniorId": "u_456",
  "question": "Avez-vous bien dormi cette nuit ?",
  "answer": "Oui"
}
```
Response 200:
```json
{
  "saved": true
}
```

---

### 9.5) Alerte SOS

#### POST `/senior/home/sos`
Request:
```json
{
  "seniorId": "u_456",
  "comment": "Douleur thoracique"
}
```
Response 201:
```json
{
  "alertId": "sos_1",
  "status": "triggered",
  "triggeredAt": "2026-03-27T14:20:00Z"
}
```

> **Note:** `latestSosAlert` dans `/senior/home` doit aussi retourner l'alerte la plus récente pour permettre au frontend d'afficher le bandeau SOS:
> ```json
> "latestSosAlert": {
>   "id": "sos_1",
>   "triggeredAt": "2026-03-27T14:20:00Z",
>   "status": "triggered",
>   "comment": "Douleur thoracique"
> }
> ```

---

### 9.6) Assistant (Chatbot conversationnel)

#### GET `/senior/assistant/history?seniorId={id}`
Paramètres query:
- `seniorId` (obligatoire) — ID du senior
- `date` (optionnel) — Date au format `YYYY-MM-DD`

Response 200:
```json
{
  "conversation": {
    "messages": [
      {
        "id": 1,
        "sender": "bot",
        "message": "Bonjour, comment vous sentez-vous aujourd'hui ?",
        "createdAt": "2026-03-27T10:00:00Z"
      },
      {
        "id": 2,
        "sender": "senior",
        "message": "Je vais bien",
        "createdAt": "2026-03-27T10:01:00Z"
      }
    ],
    "quickReplies": ["Je vais bien", "J'ai mal quelque part", "Mes médicaments"]
  }
}
```

> **Notes:**
> - `sender` doit être `"bot"` ou `"senior"` (le frontend normalise aussi `"user"` → `"senior"`).
> - `quickReplies` est optionnel — si absent, le frontend utilise des suggestions par défaut.
> - Si l'historique est vide, retourner `messages: []` — le frontend affichera un message d'accueil automatiquement.

#### POST `/senior/assistant/chat`
Request:
```json
{
  "seniorId": "u_456",
  "message": "J'ai mal à la tête",
  "date": "2026-03-27"
}
```

> **Note:** `date` est optionnel dans la request.

Response 200:
```json
{
  "conversation": {
    "messages": [
      {
        "id": 1,
        "sender": "bot",
        "message": "Bonjour, comment vous sentez-vous aujourd'hui ?",
        "createdAt": "2026-03-27T10:00:00Z"
      },
      {
        "id": 2,
        "sender": "senior",
        "message": "J'ai mal à la tête",
        "createdAt": "2026-03-27T10:02:00Z"
      },
      {
        "id": 3,
        "sender": "bot",
        "message": "Je suis désolé d'entendre ça. Avez-vous pris vos médicaments aujourd'hui ?",
        "createdAt": "2026-03-27T10:02:01Z"
      }
    ],
    "latestBotMessage": {
      "message": "Je suis désolé d'entendre ça. Avez-vous pris vos médicaments aujourd'hui ?",
      "createdAt": "2026-03-27T10:02:01Z"
    },
    "quickReplies": ["Oui", "Non", "Je ne sais pas"]
  }
}
```

> **Notes:**
> - `messages` doit contenir **tout** l'historique de conversation mis à jour (pas juste le dernier message).
> - `latestBotMessage` est un raccourci vers la dernière réponse du bot — utilisé en fallback si `messages` est vide.

---

## 10) Règle d'intégration frontend (très important)
Pour éviter de casser le frontend, **garder exactement les mêmes noms de champs de réponse** que dans les exemples ci-dessus (`user`, `id`, `name`, `email`, `role`, `token`, `message`, `medications`, `nextMedication`, `dailyQuestions`, `nextAppointment`, `latestSosAlert`, `conversation`, etc.).

Si un nom change côté backend, il faudra modifier le frontend aussi.

## 11) Règles de format (important)
- Utiliser les dates/horodatages en **ISO 8601** (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ssZ`).
- Garder les heures de prise (`time`) au format `HH:mm`.
- Les `period` valides sont: `Matin`, `Midi`, `Soir`, `Ponctuel` (la comparaison frontend est case-insensitive).
- Les `status` de médicaments valides sont: `taken`, `pending`, `missed`, `upcoming`.
- Les `sender` du chatbot valides sont: `bot`, `senior`.

## 12) Authentification — Header requis
Toutes les requêtes (sauf `/auth/*`) doivent inclure le header:
```
Authorization: Bearer <token>
```
Le token est celui retourné par `/auth/login` ou `/auth/register`.

## 13) Résumé des 9 endpoints à implémenter

| # | Méthode | Chemin | Description |
|---|---------|--------|-------------|
| 1 | POST | `/auth/login` | Connexion |
| 2 | POST | `/auth/register` | Inscription |
| 3 | POST | `/auth/forgot-password` | Mot de passe oublié |
| 4 | GET | `/senior/home?seniorId=X` | Dashboard agrégé (données complètes) |
| 5 | GET | `/senior/medications?seniorId=X&period=all` | Liste médicaments filtrée |
| 6 | POST | `/senior/home/medications/{id}/take` | Marquer médicament pris |
| 7 | POST | `/senior/home/checkins` | Soumettre check-in quotidien |
| 8 | POST | `/senior/home/sos` | Déclencher alerte SOS |
| 9 | GET | `/senior/assistant/history?seniorId=X` | Historique conversation assistant |
| 10 | POST | `/senior/assistant/chat` | Envoyer message à l'assistant |
