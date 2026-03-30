# CuraFamilia Backend Contract

Postman note: every `curl` snippet below can be imported directly into Postman.

## Auth

- Secured REST routes require `Authorization: Bearer <JWT>`.
- Senior users always resolve to the JWT subject for senior-owned actions.
- Family users must pass a `seniorId` or senior path param only when the route targets a linked senior.
- Socket auth uses `ws://<host>/ws/events?token=<JWT>&seniorId=<optional-linked-senior-id>`.

## Error Format

All 401/403/404 responses use the same JSON envelope:

```json
{
  "status": 403,
  "code": "forbidden",
  "message": "Family account is not linked to this senior.",
  "path": "/api/family/seniors/42/dashboard",
  "timestamp": "2026-03-30T00:50:23Z"
}
```

## Updated Route List

### Public

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`

### Secured Legacy Senior Routes

- `GET /senior/home?seniorId={id}&date=YYYY-MM-DD`
- `POST /senior/home/medications/{medicationId}/take`
- `POST /senior/home/checkins`
- `POST /senior/home/sos`
- `GET /senior/assistant/history?seniorId={id}&date=YYYY-MM-DD`
- `POST /senior/assistant/chat`
- `GET /senior/medications?seniorId={id}&period={all|matin|midi|soir|ponctuel}`
- `GET /senior/profile?seniorId={id}`
- `POST /senior/profile?seniorId={id}`

### Secured API Routes

- `GET /api/senior/{seniorId}`
- `PUT /api/senior/{seniorId}/profile`
- `POST /api/medications`
- `PUT /api/medications/{medicationId}`
- `DELETE /api/medications/{medicationId}`
- `POST /api/appointments`
- `PUT /api/appointments/{appointmentId}`
- `DELETE /api/appointments/{appointmentId}`
- `POST /api/links/generate`
- `POST /api/links/verify`
- `POST /api/links/use`
- `GET /api/links/my-seniors`
- `DELETE /api/links/{seniorId}`
- `GET /api/family/seniors/{seniorId}/analytics/adherence?days=7`
- `GET /api/family/seniors/{seniorId}/analytics/checkins?days=7`
- `GET /api/family/seniors/{seniorId}/analytics/health-score`
- `GET /api/family/seniors/{seniorId}/dashboard`
- `GET /api/family/sos/history?seniorId={id}&limit=20`
- `POST /api/family/sos/{alertId}/acknowledge`
- `POST /api/family/sos/{alertId}/resolve`

### Realtime

- `WS /ws/events`

## REST Contracts

### `GET /api/senior/{seniorId}`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/senior/42" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "name": "Fatima Benali",
  "email": "fatima@example.com",
  "age": 74,
  "city": "Casablanca",
  "medicalCondition": "Hypertension",
  "bloodType": "O+",
  "allergies": "Penicillin",
  "emergencyContactName": "Sara Benali",
  "emergencyContactPhone": "+212600000001",
  "emergencyContactRelation": "Daughter",
  "profile": {
    "seniorId": 42,
    "dateOfBirth": "1951-02-10",
    "city": "Casablanca",
    "chronicDiseases": "Hypertension",
    "bloodType": "O+",
    "allergies": "Penicillin",
    "mainDoctorName": "Dr Amine",
    "emergencyContactName": "Sara Benali",
    "emergencyContactPhone": "+212600000001",
    "emergencyContactRelation": "Daughter",
    "specialNote": "Uses walker"
  }
}
```

Frontend note: family can call this for any active link; senior can call it with any path id and still receive self data.

### `PUT /api/senior/{seniorId}/profile`

`curl`:

```bash
curl -X PUT "http://localhost:8080/api/senior/42/profile" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"city\":\"Casablanca\",\"specialNote\":\"Uses walker\"}"
```

Response: same shape as `GET /api/senior/{seniorId}`.

Frontend note: optimistic UI is safe; a `profile:updated` websocket event is emitted right after commit.

### `POST /api/medications`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/medications" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seniorId\":42,\"name\":\"Lisinopril\",\"dosage\":\"10mg\",\"time\":\"09:00\",\"frequency\":\"Tous les jours\",\"period\":\"matin\"}"
```

Response:

```json
{
  "message": "Medication creee.",
  "medication": {
    "id": 15,
    "seniorId": 42,
    "name": "Lisinopril",
    "dosage": "10mg",
    "time": "09:00",
    "frequency": "Tous les jours",
    "period": "matin",
    "instruction": null,
    "active": true
  }
}
```

Frontend note: family may send `seniorId`; senior users can omit it because the backend derives self from JWT.

### `PUT /api/medications/{medicationId}`

`curl`:

```bash
curl -X PUT "http://localhost:8080/api/medications/15" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"dosage\":\"20mg\",\"instruction\":\"Take after breakfast\"}"
```

Response: same shape as create, with updated fields.

Frontend note: partial updates are supported; unchanged fields can be omitted.

### `DELETE /api/medications/{medicationId}`

`curl`:

```bash
curl -X DELETE "http://localhost:8080/api/medications/15" \
  -H "Authorization: Bearer TOKEN"
```

Response: same shape as create, with `active=false`.

Frontend note: this is a soft delete; remove the row locally when the response or `medication:deleted` event arrives.

### `POST /api/appointments`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/appointments" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seniorId\":42,\"specialty\":\"Cardiologie\",\"appointmentAt\":\"2026-04-05T10:30:00\",\"doctorName\":\"Dr Amine\"}"
```

Response:

```json
{
  "message": "Rendez-vous cree.",
  "appointment": {
    "id": 9,
    "seniorId": 42,
    "specialty": "Cardiologie",
    "appointmentAt": "2026-04-05T10:30:00",
    "doctorName": "Dr Amine",
    "notes": null,
    "status": "scheduled"
  }
}
```

Frontend note: use ISO datetimes; the payload is rebroadcast as `appointment:created`.

### `PUT /api/appointments/{appointmentId}`

`curl`:

```bash
curl -X PUT "http://localhost:8080/api/appointments/9" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"done\",\"notes\":\"Vitals stable\"}"
```

Response: same shape as create, with updated fields.

Frontend note: partial update semantics match medication updates.

### `DELETE /api/appointments/{appointmentId}`

`curl`:

```bash
curl -X DELETE "http://localhost:8080/api/appointments/9" \
  -H "Authorization: Bearer TOKEN"
```

Response: same shape as create.

Frontend note: remove the appointment immediately after the HTTP success or `appointment:deleted` event.

### `POST /api/links/generate`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/links/generate" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"expiresInDays\":7}"
```

Response:

```json
{
  "code": "483921",
  "expiresAt": "2026-04-06T11:30:00",
  "senior": {
    "seniorId": 42,
    "name": "Fatima Benali",
    "age": 74,
    "city": "Casablanca",
    "medicalCondition": "Hypertension",
    "bloodType": "O+",
    "linkedAt": "2026-03-30T11:30:00"
  }
}
```

Frontend note: this route is senior-only; do not trust or require a client-side `seniorId` for senior sessions.

### `POST /api/links/verify`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/links/verify" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"483921\"}"
```

Response:

```json
{
  "valid": true,
  "message": "Code valide.",
  "expiresAt": "2026-04-06T11:30:00",
  "senior": {
    "seniorId": 42,
    "name": "Fatima Benali",
    "age": 74,
    "city": "Casablanca",
    "medicalCondition": "Hypertension",
    "bloodType": "O+",
    "linkedAt": "2026-04-06T11:30:00"
  },
  "alreadyLinked": false
}
```

Frontend note: use this for the confirmation screen before `use`; `valid=false` is the expected expired/used-code path.

### `POST /api/links/use`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/links/use" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"483921\"}"
```

Response:

```json
{
  "message": "Liaison etablie avec succes.",
  "senior": {
    "seniorId": 42,
    "name": "Fatima Benali",
    "age": 74,
    "city": "Casablanca",
    "medicalCondition": "Hypertension",
    "bloodType": "O+",
    "linkedAt": "2026-03-30T11:35:00"
  }
}
```

Frontend note: this route is one-time use; a second use returns `404 not_found`.

### `GET /api/links/my-seniors`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/links/my-seniors" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "count": 1,
  "seniors": [
    {
      "seniorId": 42,
      "name": "Fatima Benali",
      "age": 74,
      "city": "Casablanca",
      "medicalCondition": "Hypertension",
      "bloodType": "O+",
      "linkedAt": "2026-03-30T11:35:00"
    }
  ]
}
```

Frontend note: use this as the family-side senior picker source.

### `DELETE /api/links/{seniorId}`

`curl`:

```bash
curl -X DELETE "http://localhost:8080/api/links/42" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "message": "Liaison retiree avec succes.",
  "senior": {
    "seniorId": 42,
    "name": "Fatima Benali",
    "age": 74,
    "city": "Casablanca",
    "medicalCondition": "Hypertension",
    "bloodType": "O+",
    "linkedAt": "2026-03-30T11:40:00"
  }
}
```

Frontend note: after success, immediately remove the senior from family-side state and close any open room subscription for that senior.

### `GET /api/family/seniors/{seniorId}/analytics/adherence?days=7`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/family/seniors/42/analytics/adherence?days=7" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "days": 7,
  "summary": {
    "scheduledCount": 14,
    "takenCount": 12,
    "percentage": 85.7
  },
  "timeline": [
    { "date": "2026-03-24", "scheduledCount": 2, "takenCount": 2, "percentage": 100.0 }
  ]
}
```

Frontend note: chart-friendly already; no extra client aggregation is needed.

### `GET /api/family/seniors/{seniorId}/analytics/checkins?days=7`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/family/seniors/42/analytics/checkins?days=7" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "days": 7,
  "timeline": [
    {
      "date": "2026-03-24",
      "checkinsCount": 2,
      "moodScore": 2.5,
      "moodLabel": "stable",
      "latestAnswer": "Bien",
      "summaryText": "Resume du jour: il semble aller plutot bien."
    }
  ]
}
```

Frontend note: `moodScore` is normalized to a 1-3 scale for sparkline or strip rendering.

### `GET /api/family/seniors/{seniorId}/analytics/health-score`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/family/seniors/42/analytics/health-score" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "score": 82,
  "status": "strong",
  "formula": "score = adherence*0.50 + checkin_completion*0.20 + mood*0.20 + sos_safety*0.10 over the last 7 days",
  "breakdown": {
    "adherencePercentage": 85.7,
    "checkinCompletionPercentage": 85.7,
    "averageMoodScore": 2.5,
    "moodPercentage": 75.0,
    "sosSafetyPercentage": 100.0
  }
}
```

Frontend note: render the score as authoritative from backend; avoid recomputing weights client-side.

### `GET /api/family/seniors/{seniorId}/dashboard`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/family/seniors/42/dashboard" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "hero": {
    "name": "Fatima Benali",
    "age": 74,
    "city": "Casablanca",
    "medicalCondition": "Hypertension",
    "bloodType": "O+",
    "nextAppointmentAt": "2026-04-05T10:30:00",
    "activeSosStatus": null,
    "currentMoodLabel": "stable"
  },
  "kpis": {
    "adherence7dPercentage": 85.7,
    "checkins7dCount": 10,
    "healthScore": 82,
    "activeMedicationsCount": 2,
    "activeSosCount": 0
  },
  "timeline": [
    {
      "type": "medication:taken",
      "title": "Lisinopril",
      "subtitle": "Prise enregistree",
      "occurredAt": "2026-03-30T09:03:00",
      "status": "taken"
    }
  ],
  "moodStrip": [
    { "date": "2026-03-24", "moodScore": 2.5, "moodLabel": "stable" }
  ],
  "aiSummary": {
    "generatedAt": "2026-03-30T11:45:00",
    "source": "chatbot_daily_summaries",
    "text": "Resume du jour: il semble aller plutot bien. Aucune alerte majeure detectee."
  }
}
```

Frontend note: this is the preferred family landing call; it intentionally replaces multiple dashboard fetches.

### `GET /api/family/sos/history?seniorId={id}&limit=20`

`curl`:

```bash
curl -X GET "http://localhost:8080/api/family/sos/history?seniorId=42&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "seniorId": 42,
  "count": 1,
  "alerts": [
    {
      "id": 7,
      "seniorId": 42,
      "status": "resolved",
      "triggeredAt": "2026-03-30T11:20:00",
      "comment": "Chest pain",
      "acknowledgedAt": "2026-03-30T11:21:00",
      "acknowledgedByUserId": 9,
      "resolvedAt": "2026-03-30T11:23:00",
      "resolvedByUserId": 9
    }
  ]
}
```

Frontend note: use this for SOS detail drawers and audit/history views.

### `POST /api/family/sos/{alertId}/acknowledge`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/family/sos/7/acknowledge" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "message": "Alerte SOS accusee de reception.",
  "alert": {
    "id": 7,
    "seniorId": 42,
    "status": "acknowledged",
    "triggeredAt": "2026-03-30T11:20:00",
    "comment": "Chest pain",
    "acknowledgedAt": "2026-03-30T11:21:00",
    "acknowledgedByUserId": 9,
    "resolvedAt": null,
    "resolvedByUserId": null
  },
  "alreadyActive": false
}
```

Frontend note: transition the active SOS card immediately and let the `sos:acknowledged` event fan that change out to every open family view.

### `POST /api/family/sos/{alertId}/resolve`

`curl`:

```bash
curl -X POST "http://localhost:8080/api/family/sos/7/resolve" \
  -H "Authorization: Bearer TOKEN"
```

Response:

```json
{
  "message": "Alerte SOS resolue.",
  "alert": {
    "id": 7,
    "seniorId": 42,
    "status": "resolved",
    "triggeredAt": "2026-03-30T11:20:00",
    "comment": "Chest pain",
    "acknowledgedAt": "2026-03-30T11:21:00",
    "acknowledgedByUserId": 9,
    "resolvedAt": "2026-03-30T11:23:00",
    "resolvedByUserId": 9
  },
  "alreadyActive": false
}
```

Frontend note: once resolved, remove the active SOS banner and archive the entry in history.

## WebSocket Contract

### Connect

```text
ws://localhost:8080/ws/events?token=JWT&seniorId=42
```

- Seniors auto-subscribe to their own room even if `seniorId` is omitted.
- Family users may subscribe only to active linked seniors.

### Client Messages

Subscribe:

```json
{ "action": "subscribe", "seniorId": 42 }
```

Unsubscribe:

```json
{ "action": "unsubscribe", "seniorId": 42 }
```

Ping:

```json
{ "action": "ping" }
```

### Server Status Messages

```json
{
  "type": "ready",
  "message": "Socket connected.",
  "seniorIds": [42],
  "serverTime": "2026-03-30T11:50:00"
}
```

### Event Envelope

```json
{
  "event": "medication:taken",
  "seniorId": 42,
  "actorUserId": 42,
  "actorRole": "senior",
  "occurredAt": "2026-03-30T09:03:00",
  "data": {}
}
```

### Emitted Events

- `medication:taken`
- `medication:added`
- `medication:updated`
- `medication:deleted`
- `checkin:answered`
- `sos:triggered`
- `sos:acknowledged`
- `sos:resolved`
- `appointment:created`
- `appointment:updated`
- `appointment:deleted`
- `profile:updated`
- `link:created`
- `link:unlinked`

Frontend note: keep one socket open per authenticated session, subscribe to the currently selected senior, and apply incoming events as source-of-truth patches. The backend emits immediately after commit, so UI refresh time should stay under one second on the same server instance.
