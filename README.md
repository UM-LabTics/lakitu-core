<div align="center">
  <img src="frontend/public/imagotipo_animado.svg" alt="Lakitu" width="420"/>
  <br/><br/>
  <p><strong>Smart parking availability — cloud backend & web frontend</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white" />
    <img src="https://img.shields.io/badge/FastAPI-0.135-009688?logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/AWS-IoT%20%7C%20SQS%20%7C%20S3%20%7C%20RDS-FF9900?logo=amazonaws&logoColor=white" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
  </p>
</div>

---

## Overview

**Lakitu** is a distributed smart-parking system that uses computer vision at the edge to detect parking spot occupancy in real time and streams that data to the cloud for live display and historical analysis.

This repository — **`lakitu-core`** — contains the **cloud backend and web frontend**. The edge device code lives in the companion repository [**`lakitu-edge`**](https://github.com/um-labtics/lakitu-edge).

```
lakitu-edge  ──(AWS IoT / SQS)──►  lakitu-core (backend + frontend)
 Raspberry Pi                           FastAPI · Next.js · PostgreSQL
 Camera + CV                            Redis · S3 · WebSockets
```

---

## Features

- **Live feed** — real-time parking occupancy streamed to connected browsers via WebSocket, powered by Redis as a hot cache.
- **Historical queries** — point-in-time and range-based queries reconstruct the exact state of every spot at any moment in the past.
- **On-demand snapshots** — admins can trigger a photo from the edge camera in-browser via AWS IoT Core commands over MQTT.
- **Statistics dashboard** (admin only):
  - Daily occupancy curve
  - Per-spot usage time and percentage
  - Per-spot rotation count
  - Occupancy heatmap
- **JWT authentication** with role-based access (regular user / admin).
- **Per-lot access control** — users only see the parking lots they have been granted access to.
- **Pi mock** — a Docker service that simulates the edge device for local development without physical hardware.

---

## Architecture

<img src="docs/diagrams/Diagrama de componentes.png" alt="Component Diagram" width=100%/>

### Key components

| Component | Description |
|---|---|
| `CloudReceptor` | Asynchronous SQS polling loop. Validates and parses incoming `StateUpdateEvent` messages from the edge device. |
| `CommandManager` | Sends `request_photo` commands to edge devices via AWS IoT Core HTTP API, and awaits their MQTT response with an `asyncio.Future`. |
| `CloudBackend` | Orchestrates event processing: updates Redis, broadcasts over WebSocket, delegates DB + S3 writes to `Persistence`. |
| `Persistence` | SQLAlchemy async layer over PostgreSQL (RDS). Reconstructs full parking-lot state at arbitrary points in time by replaying delta events. |
| `Stats` | Computes analytics queries (daily occupancy, spot usage timelines, rotation counts) directly from the event log. |
| WebSocket Manager | Maintains per-parking-lot connection lists and broadcasts state updates to all connected browser clients. |

---

## Repository structure

```
lakitu-core/
├── docker-compose.yml          # Local development stack
├── .env.example                # Environment variable template
│
├── backend/                    # FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # App entrypoint and lifespan
│       ├── models.py           # Pydantic domain models
│       ├── settings.py         # Pydantic-settings config (env vars)
│       ├── api/
│       │   ├── rest/           # HTTP endpoints (auth, events, parkings, stats)
│       │   └── websockets/     # WebSocket endpoint and connection manager
│       ├── auth/               # JWT auth service (bcrypt + PyJWT)
│       ├── business_logic/     # CloudBackend
│       ├── cloud_receptor/     # SQS polling (CloudReceptor) + IoT commands (CommandManager)
│       └── persistence/        # SQLAlchemy tables, Persistence, Stats
│
├── frontend/                   # Next.js 16 / React 19 application
│   ├── Dockerfile
│   ├── app/
│   │   ├── (authPages)/        # Login and signup pages
│   │   └── (mainApp)/
│   │       ├── home/           # Main navigation hub
│   │       ├── liveFeed/       # Real-time WebSocket parking view
│   │       ├── pastQueries/    # Historical state queries
│   │       └── stats/          # Admin analytics dashboard
│   ├── components/             # Reusable UI components
│   └── lib/                    # API clients, hooks, types
│
└── pi_mock/                    # Simulated edge device for local dev
    ├── Dockerfile
    └── mock_pi.py
```

---

## Tech stack

### Backend
| | |
|---|---|
| **Runtime** | Python 3.11 |
| **Framework** | FastAPI + Uvicorn |
| **Database ORM** | SQLAlchemy 2 (async) + psycopg 3 |
| **Cache** | Redis 7 |
| **Auth** | PyJWT + passlib/bcrypt |
| **AWS SDK** | boto3 (SQS, S3), awsiotsdk (MQTT) |
| **Validation** | Pydantic v2 + pydantic-settings |

### Frontend
| | |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI library** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, CSS variables |
| **Font** | Fredoka (Google Fonts) |
| **Charts** | Recharts |
| **Icons** | lucide-react |
| **Live data** | reconnecting-websocket |
| **Date utilities** | date-fns |

### AWS services
| Service | Role |
|---|---|
| **IoT Core** | MQTT broker for edge device connectivity and command delivery |
| **SQS** | Durable message queue between edge device and backend |
| **S3** | Parking snapshot image storage |
| **RDS (PostgreSQL)** | Persistent event and state storage |
| **ElastiCache (Redis)** | Hot-path current-state cache; WebSocket fan-out |

---

## Getting started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with Compose v2)
- AWS account with the services above provisioned
- AWS IoT device certificates for the backend (to send commands over MQTT)
- AWS IoT device certificates for the edge device — see [`lakitu-edge`](https://github.com/um-labtics/lakitu-edge)

### 1. Clone and configure

```bash
git clone https://github.com/um-labtics/lakitu-core.git
cd lakitu-core
cp .env.example .env
```

Open `.env` and fill in every value. The required keys are:

```dotenv
# AWS credentials (or use an IAM role on EC2 and leave these blank)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-2

# IoT Core
IOT_ENDPOINT=xxxxxxxxxxxx-ats.iot.us-east-2.amazonaws.com
IOT_TOPIC=parking/topic
IOT_CLIENT_ID=your-client-id
IOT_CERT_PATH=./secrets/device.crt
IOT_KEY_PATH=./secrets/device.key

# SQS
SQS_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/ACCOUNT_ID/queue-name

# S3
S3_BUCKET_NAME=your-bucket-name

# PostgreSQL (RDS)
DATABASE_URL=postgresql+psycopg://user:password@host:5432/dbname

# JWT
JWT_SECRET=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
```

### 2. Add IoT certificates

Place your backend MQTT certificates in `./secrets/`:

```
secrets/
├── device.crt
└── device.key
```

### 3. Run the stack

```bash
docker compose up --build
```

This starts four services:

| Service | Port | Description |
|---|---|---|
| `frontend` | 3000 | Next.js dev server |
| `backend` | 8000 | FastAPI with Uvicorn hot-reload |
| `redis` | 6379 | Redis (append-only persistence) |
| `pi_mock` | — | Simulated edge device (publishes to IoT) |

The frontend is available at **http://localhost:3000**.  
The backend API and WebSocket are available at **http://localhost:8000**.

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | ✱ | — | AWS access key (use IAM role in production) |
| `AWS_SECRET_ACCESS_KEY` | ✱ | — | AWS secret key |
| `AWS_DEFAULT_REGION` | | `us-east-2` | AWS region |
| `IOT_ENDPOINT` | ✱ | — | AWS IoT Core endpoint |
| `IOT_TOPIC` | ✱ | — | MQTT topic the edge device publishes to |
| `IOT_CLIENT_ID` | ✱ | — | MQTT client identifier for the backend |
| `IOT_CERT_PATH` | ✱ | — | Path to the backend MQTT certificate |
| `IOT_KEY_PATH` | ✱ | — | Path to the backend MQTT private key |
| `SQS_QUEUE_URL` | ✱ | — | SQS queue URL for state update messages |
| `SQS_POLL_INTERVAL_SECONDS` | | `2` | How often (in seconds) to poll SQS |
| `SQS_MAX_MESSAGES` | | `10` | Max messages per SQS poll (max 10) |
| `S3_BUCKET_NAME` | ✱ | — | S3 bucket for parking snapshot images |
| `DATABASE_URL` | ✱ | — | PostgreSQL connection string (SQLAlchemy async format) |
| `REDIS_URL` | | `redis://redis:6379/0` | Redis connection URL |
| `JWT_SECRET` | ✱ | — | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | | `263520` | Token lifetime (default ≈ 6 months) |
| `ENVIRONMENT` | | `development` | `development` or `production` |
| `LOG_LEVEL` | | `debug` | Logging verbosity |
| `MESSAGE_COUNT` | | `5` | `pi_mock` only — messages to send (0 = infinite) |
| `SEND_INTERVAL_SECONDS` | | `5` | `pi_mock` only — interval between messages |
| `NUM_SPOTS` | | `12` | `pi_mock` only — number of spots to simulate |
| `PARKING_ID` | | `mock-01` | `pi_mock` only — parking lot identifier |
| `PARKING_NAME` | | `Mock-Parking-Lot` | `pi_mock` only — parking lot display name |

---

## API overview

All endpoints are prefixed with `/api`.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/signup` | Register a new user |
| `POST` | `/api/login` | Authenticate and receive a JWT |

### Parking lots

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/getParkings` | ✓ | List parking lots accessible to the current user |
| `GET` | `/takePhoto` | — | Trigger an on-demand camera snapshot from the edge device |

### Events (historical data)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/events?parking_id=&from=` | Reconstruct parking state at a point in time |
| `GET` | `/api/events?parking_id=&from=&to=` | Paginated list of state snapshots over a time range |

### Statistics (admin)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/stats/dailyOccupancy` | Occupied spots over the course of a day |
| `GET` | `/api/stats/spotsUsage` | Total occupied time per spot over a date range |
| `GET` | `/api/stats/spotsRotations` | Number of occupancy changes per spot over a date range |

### WebSocket

| Path | Description |
|---|---|
| `ws://<host>/ws/{parking_id}` | Subscribe to live state updates for a parking lot. Sends the current state immediately on connect, then pushes updates as they arrive. |

---

## Database schema

<img src="docs/diagrams/Esquema DB.png" />

State is stored as a stream of **delta events** — only spots that changed status are recorded per event. Full state at any point in time is reconstructed by replaying deltas from the beginning (or from the most recent known base state).

---

## Pi mock

The `pi_mock` service is a lightweight Docker container that impersonates a Raspberry Pi camera device for local development. It connects to AWS IoT Core with MQTT5 certificates and publishes simulated `StateUpdateEvent` messages at a configurable interval, including a base64-encoded synthetic camera snapshot.

To run it continuously (without stopping after N messages), set `MESSAGE_COUNT=0` in `.env`.

---

## Development

### Dev containers

The repository ships with VS Code Dev Container definitions for both services:

- `.devcontainer/backend/devcontainer.json` — Python 3.11, Black formatter, Pylance
- `.devcontainer/frontend/devcontainer.json` — ESLint, Prettier, Tailwind IntelliSense

Open the repository in VS Code and select **Reopen in Container** for either service.

### Smoke test

A quick integration test verifies the WebSocket, broadcast, and REST event endpoints:

```bash
cd backend
python smoke_test.py
```

### Frontend dev page

A component style guide is available in development at **http://localhost:3000/dev**, showing every UI component (buttons, cards, inputs, selects, etc.) in all variants and states.

---

## Related repository

| Repo | Description |
|---|---|
| [`lakitu-edge`](https://github.com/um-labtics/lakitu-edge) | Edge device firmware — Raspberry Pi, camera, computer vision, MQTT5 publishing |

---

<div align="center">
  <img src="frontend/public/isotipo.svg" alt="Lakitu icon" width="80"/>
  <br/>
  <sub>Universidad de Montevideo</sub>
</div>
