# Room Booking API

![CI](https://github.com/justirap/room-booking-api/actions/workflows/ci.yml/badge.svg)

API do rezerwacji sal. Po sklonowaniu repozytorium wystarczy skopiować zmienne środowiskowe i uruchomić Docker Compose.

## Uruchomienie od zera

```bash
git clone https://github.com/justirap/room-booking-api.git
cd room-booking-api
cp .env.example .env
docker compose up --build
```

W PowerShell zamiast `cp` można użyć `Copy-Item .env.example .env`.

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/api/docs

## Konto administratora

Seed da się uruchomić w działającym kontenerze:

```bash
docker compose exec api npx knex seed:run
```

- administrator: `admin@example.com` / `admin-password-123`
- użytkownik: `anna.nowak@example.com` / `user-password-123`

## Zatrzymanie

```bash
docker compose down
```

Dane PostgreSQL zostają w wolumenie `pgdata`. Usuwa je dopiero `docker compose down -v`.

## Testy

Testy integracyjne używają osobnej bazy `roombooking_test` (nigdy developerskiej). Najpierw utwórz pustą bazę, potem uruchom testy:

```bash
npm install
npm test
```

Osobno: `npm run test:unit` oraz `npm run test:integration`.
