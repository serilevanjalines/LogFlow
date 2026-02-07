# LogFlow Technical Architecture Specification

This document outlines the architectural design and data flow of the LogFlow observability platform. The system is designed for high-availability, consistent telemetry ingestion, and low-latency diagnostic reasoning.

## High-Level Data Orchestration

```
USER INTERACTION
      ↓
┌─────────────────────────────────────────────────────────────┐
│                  Browser (localhost:3000)                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            React Components                          │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Main Features:                                 │  │  │
│  │  │ • Time-Travel Debugger                         │  │  │
│  │  │ • AI Assistant Chat                            │  │  │
│  │  │ • System Metrics Display                       │  │  │
│  │  │ • Live Logs Sidebar                            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  API Service Layer (src/services/api.js)            │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ • checkHealth()                                │  │  │
│  │  │ • getLogs()                                    │  │  │
│  │  │ • getMetrics()                                 │  │  │
│  │  │ • compareLogsPeriods()                         │  │  │
│  │  │ • queryAI()                                    │  │  │
│  │  │ • ingestLog()                                  │  │  │
│  │  │ • getSummary()                                 │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────┬───────────────────────────────────┘  │
└─────────────────────┼──────────────────────────────────────┘
                      │ HTTP/JSON Requests
                      │ (Content-Type: application/json)
                      │
         ┌────────────┴────────────┐
         │                         │
         │ Vite Proxy              │ (In dev mode)
         │ /api/* → :8080/*        │
         │                         │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────────────────────────────┐
         │   Go Backend Server (localhost:8080)            │
         │                                                 │
         │  ┌──────────────────────────────────────────┐   │
         │  │           HTTP Handlers                  │   │
         │  │  ┌────────────────────────────────────┐  │   │
         │  │  │ GET  /health                       │  │   │
         │  │  │ GET  /logs                         │  │   │
         │  │  │ GET  /metrics                      │  │   │
         │  │  │ GET  /ai/compare                   │  │   │
         │  │  │ POST /ai/query                     │  │   │
         │  │  │ GET  /ai/summary                   │  │   │
         │  │  │ POST /ingest                       │  │   │
         │  │  └────────────────────────────────────┘  │   │
         │  └──────────────────────────────────────────┘   │
         │  ┌──────────────────────────────────────────┐   │
         │  │    CORS Middleware (Enabled)            │   │
         │  │  • Allows all origins                    │   │
         │  │  • Allows GET, POST, PUT, DELETE        │   │
         │  │  • Handles OPTIONS preflight            │   │
         │  └──────────────────────────────────────────┘   │
         │  ┌──────────────────────────────────────────┐   │
         │  │        Business Logic                    │   │
         │  │  • Query aggregation                     │   │
         │  │  • Log processing                       │   │
         │  │  • AI analysis (Gemini)                 │   │
         │  │  • Metrics calculation                  │   │
         │  └──────────────────────────────────────────┘   │
         │  ┌──────────────────────────────────────────┐   │
         │  │        Data Layer                        │   │
         │  │  ┌────────────────────────────────────┐  │   │
         │  │  │ PostgreSQL (Supabase)              │  │   │
         │  │  │ • Logs table                       │  │   │
         │  │  │ • Timestamps                       │  │   │
         │  │  │ • Metadata                         │  │   │
         │  │  └────────────────────────────────────┘  │   │
         │  ├──────────────────────────────────────────┤   │
         │  │ External Services                        │   │
         │  │  ┌────────────────────────────────────┐  │   │
         │  │  │ Gemini AI API                      │  │   │
         │  │  │ • Log analysis                     │  │   │
         │  │  │ • Root cause detection            │  │   │
         │  │  │ • Recommendations                 │  │   │
         │  │  └────────────────────────────────────┘  │   │
         │  └──────────────────────────────────────────┘   │
         │                                                 │
         └─────────────────────────────────────────────────┘
```

## Component Connection Map

```
┌──────────────────────────────────────────────────────────────┐
│                     App.jsx (Root)                           │
│                  checkHealth() every 5s                      │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────────┐     ┌────▼──────────┐    ┌───▼──────┐
    │   Sidebar   │     │   MainContent │    │  Header  │
    │             │     │               │    │          │
    │ getLogs()   │     │  ┌──────────┐ │    │ Dashboard│
    │ every 3s    │     │  │Debugger  │ │    │ Status   │
    │             │     │  │          │ │    │          │
    └─────────────┘     │  │compare   │ │    └──────────┘
                        │  │Periods() │ │
                        │  └──────────┘ │
                        │               │
                        │  ┌──────────┐ │
                        │  │  AI Chat │ │
                        │  │          │ │
                        │  │queryAI() │ │
                        │  └──────────┘ │
                        │               │
                        │  ┌──────────┐ │
                        │  │ Metrics  │ │
                        │  │          │ │
                        │  │getMetrics│ │
                        │  │ every 5s │ │
                        │  └──────────┘ │
                        └───────────────┘
```

## Request/Response Flow Example

### Example 1: Get Metrics

```
User clicks "System Metrics" tab
           │
           ▼
SystemMetrics.jsx mounts
           │
           ▼ useEffect calls
getMetrics() from api.js
           │
           ▼
apiCall('/metrics', {})
           │
           ▼
fetch('http://localhost:8080/metrics')
           │
           ▼
Vite proxy intercepts
Rewrites to: http://localhost:8080/metrics
           │
           ▼
Backend receives GET /metrics
           │
           ▼
metricsHandler() processes
           │
           ▼
Queries database for metrics
           │
           ▼
Returns JSON response
{
  "uptime": 24,
  "error_rate": 2.5,
  "avg_latency": 45,
  ...
}
           │
           ▼
Vite proxy returns response
           │
           ▼
apiCall() returns JSON
           │
           ▼
Component state updated
           │
           ▼
UI re-renders with new metrics
```

### Example 2: AI Query

```
User types question in AI Assistant
User presses Enter
           │
           ▼
handleSendMessage() called
           │
           ▼
queryAI(question) called
           │
           ▼
apiCall('/ai/query', {
  method: 'POST',
  body: JSON.stringify({question})
})
           │
           ▼
fetch('http://localhost:8080/ai/query', {
  method: 'POST',
  body: '{"question":"..."}'
})
           │
           ▼
Vite proxy passes through
           │
           ▼
Backend receives POST /ai/query
           │
           ▼
aiQueryHandler() processes
           │
           ▼
Extract question from body
           │
           ▼
Get recent logs from database
           │
           ▼
Format logs for AI prompt
           │
           ▼
Send to Gemini API
           │
           ▼
Gemini analyzes and returns response
           │
           ▼
Format response as Markdown
           │
           ▼
Return JSON to frontend
{
  "answer": "Based on your logs..."
}
           │
           ▼
Frontend receives response
           │
           ▼
Add assistant message to chat
           │
           ▼
UI updates with AI response
```

## Environment & Configuration

```
┌─────────────────────────────────────────┐
│    Frontend Configuration               │
│                                         │
│  vite.config.js                        │
│  ├─ Port: 3000                         │
│  └─ Proxy:                             │
│     /api/* → http://localhost:8080/*   │
│                                         │
│  .env (optional)                       │
│  └─ REACT_APP_API_URL=...             │
│     (defaults to localhost:8080)       │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    Backend Configuration                │
│                                         │
│  Environment Variables:                │
│  ├─ PORT=8080                          │
│  ├─ DATABASE_URL=...                   │
│  └─ GEMINI_API_KEY=...                 │
│                                         │
│  cmd/server/main.go                    │
│  └─ Listens on :8080                   │
│                                         │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
Development:
  Frontend (localhost:3000)
        ↓ HTTP
  Vite Proxy
        ↓ HTTP
  Backend (localhost:8080)
        ↓ SQL
  Database (Supabase)

Production:
  Frontend (CDN/Static hosting)
        ↓ HTTP/HTTPS
  Backend (Cloud VM/Container)
        ↓ HTTPS
  Database (Cloud Database)
        ↓ External APIs (Gemini, etc.)
```

---

**This architecture ensures:**

- ✅ Clean separation of concerns
- ✅ Easy API management
- ✅ Scalable design
- ✅ Consistent error handling
- ✅ Simple testing and debugging
- ✅ Production-ready setup
