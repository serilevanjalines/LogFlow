# LogFlow Operations and API Reference

This document serves as a technical reference for the LogFlow platform, covering internal service connections, API specifications, and operational workflows.

## Service Mapping

The platform is composed of the following core modules:

| Module | Purpose | Location |
| :--- | :--- | :--- |
| **API Ingestion Service** | High-performance Go-based telemetry ingestion | `cmd/server/main.go` |
| **Observability Interface** | React-based frontend dashboard | `UI/src/` |
| **Telemetry Agent** | Simulated system traffic and log generation | `cmd/agent/main.go` |
| **Data Access Layer** | Standardized API client for frontend-backend communication | `UI/src/services/api.js` |

## API Specification

All endpoints are hosted relative to the `API_BASE_URL`. By default, this is `http://localhost:8080` in development and `https://logflow-api.onrender.com` in production.

| Endpoint | Method | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `/health` | GET | Returns the operational status of the service. | N/A |
| `/logs` | GET | Retrieves log events filtered by time range and limit. | N/A |
| `/metrics` | GET | Aggregates system-level telemetry and health metrics. | N/A |
| `/metrics/advanced` | GET | Retrieves specialized metrics including top users and errors. | N/A |
| `/ai/compare` | GET | Performs a differential AI analysis between two log periods. | N/A |
| `/ai/query` | POST | Submits a natural language query for AI diagnostic reasoning. | `{ "question": string }` |
| `/ai/summary` | GET | Generates a high-level executive summary of recent system activity. | N/A |
| `/ingest` | POST | Ingests a new log event into the persistence layer. | `LogEvent` |

## Technical Workflows

### 1. Diagnostic Data Retrieval
The frontend utilizes the `api.js` service layer to interact with the backend. This layer ensures consistent error handling and type safety across the application.

### 2. Operational Environment Configuration
Environment variables must be configured to ensure proper system initialization:

- **DATABASE_URL**: Connection string for the PostgreSQL instance.
- **GEMINI_API_KEY**: Google AI Studio API key for diagnostic reasoning.
- **PORT**: Listening port for the backend server (Default: 8080).

### 3. Local Development Initialization

**Backend Service:**
```bash
go run ./cmd/server/main.go
```

**Frontend Interface:**
```bash
cd UI && npm run dev
```

## Troubleshooting and Error Management

| Condition | Diagnostic Action | Resolution |
| :--- | :--- | :--- |
| **Connection Refused** | Verify backend process status | Restart Go server on assigned port |
| **CORS Policy Violation** | Inspect Origin headers | Verify CORS middleware configuration in `main.go` |
| **Metadata Extraction Failure** | Check DB connectivity | Verify `DATABASE_URL` integrity |
| **AI Reasoning Timeout** | Inspect Gemini API status | Monitor API rate limits and key validity |

This reference document is intended for maintainers and developers of the LogFlow system.
