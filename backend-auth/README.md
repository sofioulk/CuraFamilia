# CuraFamilia Auth Backend

Java JEE auth-only backend for the existing MySQL database `curafamilia`.

## Project structure

```text
backend-auth/
  pom.xml
  src/main/java/com/curafamilia/auth/
    config/
    dto/
    entity/
    exception/
    repository/
    resource/
    service/
    util/
  src/main/resources/
    backend.properties
    META-INF/persistence.xml
  src/main/webapp/WEB-INF/web.xml
```

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `GET /senior/home?seniorId={id}[&date=YYYY-MM-DD]`
- `POST /senior/home/medications/{medicationId}/take`
- `POST /senior/home/checkins`
- `POST /senior/home/sos`
- `GET /senior/assistant/history?seniorId={id}[&date=YYYY-MM-DD]`
- `POST /senior/assistant/chat`

## Database configuration

Edit `src/main/resources/backend.properties`:

```properties
db.url=jdbc:mysql://localhost:3306/curafamilia?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Africa/Casablanca
db.username=root
db.password=
jwt.secret=change-this-secret-key-before-production
jwt.issuer=curafamilia-auth
jwt.expiration.minutes=120
reset.expiration.minutes=30
```

## Run instructions

1. Make sure MySQL is running in XAMPP.
2. Confirm the database `curafamilia` already exists in phpMyAdmin.
3. Update `backend-auth/src/main/resources/backend.properties` if your MySQL username/password is different.
4. Open a terminal in `c:\Users\thinkpad\curafamilia\backend-auth`.
5. Run:

```bash
mvn clean package
```

6. For local development, build first, then run the packaged WAR:

```bash
mvn clean package
mvn jetty:run-war
```

7. The API will be available at:

```text
http://localhost:8080/auth/register
http://localhost:8080/auth/login
http://localhost:8080/auth/forgot-password
```

## Example requests

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "name": "Fatima Benali",
  "email": "fatima@example.com",
  "phone": "+212600000000",
  "role": "senior",
  "password": "secret123"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "fatima@example.com",
  "password": "secret123"
}
```

### Forgot password

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "fatima@example.com"
}
```

### Senior accueil data

```http
GET /senior/home?seniorId=1
```

### Mark medication as taken

```http
POST /senior/home/medications/2/take
Content-Type: application/json

{
  "seniorId": 1,
  "scheduledAt": "2026-03-14T13:00:00",
  "takenAt": "2026-03-14T12:45:00"
}
```

### Daily check-in answer

```http
POST /senior/home/checkins
Content-Type: application/json

{
  "seniorId": 1,
  "question": "Bonjour Mme Fatima, avez-vous bien dormi cette nuit ?",
  "answer": "Oui"
}
```

### Trigger SOS

```http
POST /senior/home/sos
Content-Type: application/json

{
  "seniorId": 1,
  "comment": "Douleur thoracique"
}
```

### Assistant history

```http
GET /senior/assistant/history?seniorId=1
```

### Assistant chat

```http
POST /senior/assistant/chat
Content-Type: application/json

{
  "seniorId": 1,
  "message": "Je suis fatiguee aujourd'hui"
}
```

## Response format

Register/Login:

```json
{
  "user": {
    "id": "u_123",
    "name": "Fatima Benali",
    "email": "fatima@example.com",
    "role": "senior"
  },
  "token": "jwt_or_session_token"
}
```

Forgot password:

```json
{
  "message": "Reset link sent."
}
```
