# LogFlow - SRE Observability Dashboard

**Real-time log analysis and time-travel debugging powered by AI**

![Status](https://img.shields.io/badge/status-active-success)
![Go](https://img.shields.io/badge/Go-1.x-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%201.5-4285F4)

---

## 🎯 Overview

LogFlow is a cutting-edge SRE observability platform that combines real-time log monitoring with AI-powered analysis. Built for hackathons and production environments, it features a revolutionary **Time-Travel Debugger** that compares healthy and crash periods to identify root causes instantly.

### Key Features

✨ **Time-Travel Debugger** - Compare logs from healthy vs crash periods with AI differential analysis
🤖 **AI Assistant** - Natural language queries about your logs (powered by Google Gemini 1.5)
📊 **Real-Time Metrics** - Live system health monitoring with automatic polling
🔍 **Smart Log Filtering** - Query logs by time range with IST/UTC conversion
⚡ **Lightning Fast** - Sub-second response times with optimized database queries

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Browser (Vite Dev: 3000)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         React Components                             │ │
│  │  • Time-Travel Debugger                             │ │
│  │  • AI Assistant (Chat Interface)                    │ │
│  │  • System Metrics                                   │ │
│  │  • Live Logs Sidebar                                │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                   │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │     API Service (services/api.js)                  │ │
│  │  - getLogs() - compareLogsPeriods()               │ │
│  │  - queryAI() - getMetrics() - checkHealth()       │ │
│  └────────────────────┬────────────────────────────────┘ │
└─────────────────────┼─────────────────────────────────────┘
                      │ HTTP (Port 8080)
┌─────────────────────▼─────────────────────────────────────┐
│              Go Server (cmd/server/main.go)              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  REST API Endpoints                                 │ │
│  │  GET  /health     - Health check                   │ │
│  │  GET  /logs       - Query logs (time range)        │ │
│  │  GET  /metrics    - System metrics                 │ │
│  │  GET  /ai/compare - Differential analysis          │ │
│  │  POST /ai/query   - AI Assistant chat              │ │
│  │  POST /ingest     - Log ingestion                  │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  PostgreSQL (Supabase) + Gemini 1.5 API           │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Go 1.x** installed
- **Node.js 18+** and npm
- **Gemini API Key** (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
- **Supabase PostgreSQL** database

### 1. Clone & Setup

```powershell
cd C:\Users\seril\OneDrive\Desktop\LogFlow\LogFlow
```

### 2. Configure Environment

Create a file named `e.txt` in the project root with:

```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:pass@host:6543/postgres
PORT=8080
```

### 3. Start Backend

```powershell
# Load environment from e.txt
$env:GEMINI_API_KEY="your_key"
$env:DATABASE_URL="your_db_url"
$env:PORT="8080"

# Run server
go run ./cmd/server/main.go
```

### 4. Start Frontend

```powershell
cd UI
npm install
npm run dev
```

### 5. Open Browser

- **Frontend:** http://localhost:3000
- **API Health:** http://localhost:8080/health

---

## 🎨 Features Walkthrough

### Time-Travel Debugger

Compare system behavior between healthy and crash periods:

1. Select **Healthy Period** (date, time, AM/PM)
2. Select **Crash Period** (date, time, AM/PM)
3. Click **⚡ Compare 5 Minute Periods**
4. View AI-powered differential analysis:
   - 🎯 Root cause with confidence score
   - 📊 Evidence (timestamps, service impact, anomalies)
   - 🔧 Actionable remediation steps

**Smart Features:**

- Automatic IST → UTC conversion
- 7-minute time windows
- Gemini 1.5 analysis with structured output
- Compact stat badges + prominent analysis display

### AI Assistant

Natural language chat interface for log queries:

```
You: "Which services are failing?"
LogFlow: Shows error counts by service with time ranges

You: "Show me logs from yesterday"
LogFlow: Automatically detects time window, queries last 24 hours

You: "Tell me about Stripe errors"
LogFlow: Analyzes all Stripe-related errors with root cause
```

**Smart Time Detection:**

- "yesterday" → last 24 hours
- "last 1 hour" → past 60 minutes
- "today" → current day
- "last 6 hours" → past 6 hours

**Response Format:**

- Clean plain text (no markdown clutter)
- Proper line breaks with emojis
- Scannable bullet points
- Summary stats (logs | errors | services)

### System Metrics

Real-time dashboard showing:

- Error rate percentage
- Total log count
- Top failing services
- CPU/Memory/Latency graphs
- Auto-refresh every 3 seconds

---

## 🛠️ Tech Stack

### Backend

- **Go 1.x** - High-performance HTTP server
- **PostgreSQL** - Supabase cloud database (connection pooler port 6543)
- **Gemini 1.5** - Google's latest AI model
- **CORS Middleware** - Cross-origin support

### Frontend

- **React 18** - Component-based UI
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **Custom CSS** - Glass-morphism effects, gradients, animations

### Key Libraries

- `github.com/joho/godotenv` - Environment config
- `github.com/lib/pq` - PostgreSQL driver
- Custom Gemini client (`internal/ai/gemini.go`)

---

## 📊 Database Schema

```sql
CREATE TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  service VARCHAR(255) NOT NULL,
  level VARCHAR(50) NOT NULL,
  route VARCHAR(500),
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_service ON logs(service);
CREATE INDEX idx_logs_level ON logs(level);
```

---

## 🔧 Development Tips

### Backend Commands

```powershell
# Run server
go run ./cmd/server/main.go

# Run agent (log generator)
go run ./cmd/agent/main.go

# Check dependencies
go mod tidy
```

### Frontend Commands

```powershell
cd UI

# Development mode (with hot reload)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Testing Endpoints

```powershell
# Health check
curl http://localhost:8080/health

# Get logs (last 50)
curl "http://localhost:8080/logs?limit=50"

# Get metrics
curl http://localhost:8080/metrics

# Compare periods (Time-Travel)
curl "http://localhost:8080/ai/compare?healthy=2026-02-04T12:12:00Z&crash=2026-02-04T13:08:00Z"
```

---

## 🎯 Project Structure

```
LogFlow/
├── cmd/
│   ├── server/main.go          # Backend HTTP server
│   └── agent/main.go            # Log generation agent
├── internal/
│   └── ai/gemini.go             # Gemini API client
├── UI/
│   ├── src/
│   │   ├── components/LogFlow/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx      # Live logs
│   │   │   ├── MainContent.jsx
│   │   │   └── Tabs/
│   │   │       ├── TimeTravelDebugger.jsx
│   │   │       ├── AiAssistant.jsx
│   │   │       └── SystemMetrics.jsx
│   │   ├── services/api.js      # Centralized API layer
│   │   └── styles/logflow.css   # Custom styling
│   ├── vite.config.js           # Vite configuration (proxy setup)
│   └── package.json
├── e.txt                        # Environment variables
├── go.mod                       # Go dependencies
└── README.md                    # This file
```

---

## 🐛 Troubleshooting

### Backend Won't Start

- ✅ Check `GEMINI_API_KEY` and `DATABASE_URL` are set
- ✅ Verify PostgreSQL connection (try `psql` command)
- ✅ Check port 8080 is not in use

### Frontend Build Fails

- ✅ Run `npm install` first
- ✅ Check for CSS syntax errors
- ✅ Clear node_modules: `rm -rf node_modules && npm install`

### CORS Errors

- ✅ Backend CORS middleware is enabled (check `cmd/server/main.go`)
- ✅ Vite proxy is configured (check `vite.config.js`)

### AI Responses Not Showing

- ✅ Check Gemini API key is valid
- ✅ Look for "\*\* symbols" in responses (CSS needs `white-space: pre-wrap`)
- ✅ Check browser console for errors

---

## 🌟 Hackathon Ready

This project is optimized for hackathons with:

- ⚡ **Fast setup** - Environment via single `e.txt` file
- 🎨 **Beautiful UI** - Glass-morphism, gradients, smooth animations
- 🤖 **AI-powered** - Gemini 1.5 for instant insights
- 📊 **Real-time** - Live updates every 3 seconds
- 🕐 **Time-Travel** - Revolutionary debugging feature

---

## 📝 License

MIT License - Feel free to use in hackathons and personal projects!

---

## 🙏 Acknowledgments

- **Google Gemini 1.5** - AI analysis engine
- **Supabase** - PostgreSQL hosting
- **React + Vite** - Modern frontend stack
- **TailwindCSS** - Rapid UI development

---

**Built with ❤️ for SRE teams and hackathon warriors**

🚀 Happy Debugging! 🚀

### 1. **Centralized API Service** 🎯

- **Created**: `UI/src/services/api.js`
- Single source of truth for all API calls
- Handles base URL configuration
- Centralized error handling
- Easy to maintain and update

### 2. **Updated All Components** 🔄

Components now use the API service instead of raw fetch calls:

- `App.jsx` - Health monitoring
- `Dashboard.jsx` - Logs and metrics
- `Sidebar.jsx` - Live logs display
- `TimeTravelDebugger.jsx` - Period comparison
- `AiAssistant.jsx` - AI queries
- `SystemMetrics.jsx` - Real-time metrics

### 3. **Development Infrastructure** 🛠️

- Vite proxy configured (already was, verified it works)
- Backend CORS enabled (already was, verified it works)
- Environment configuration ready
- Quick launcher batch script

### 4. **Documentation** 📚

- `FRONTEND_BACKEND_CONNECTION.md` - Complete setup guide
- `CONNECTION_SETUP_SUMMARY.md` - Changes overview
- `QUICK_REFERENCE.md` - Quick reference card
- `DEVELOPMENT_CHECKLIST.md` - Development workflow
- `.env.example` - Configuration template

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Port 3000)                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           React Components                           │ │
│  │  (App, Dashboard, TimeTravelDebugger, etc.)         │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │ Import from                       │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │        src/services/api.js (API Layer)             │ │
│  │  - getMetrics()                                     │ │
│  │  - getLogs()                                        │ │
│  │  - compareLogsPeriods()                             │ │
│  │  - queryAI()                                        │ │
│  │  - checkHealth()                                    │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │ HTTP Requests                     │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │      Vite Proxy (/api/* → localhost:8080/*)       │ │
│  └────────────────────┬────────────────────────────────┘ │
└─────────────────────┼─────────────────────────────────────┘
                      │ HTTP (Port 8080)
                      │
┌─────────────────────▼─────────────────────────────────────┐
│            Go Server (cmd/server/main.go)                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              API Endpoints                          │ │
│  │  - GET  /health                                    │ │
│  │  - GET  /logs                                      │ │
│  │  - GET  /metrics                                   │ │
│  │  - GET  /ai/compare                               │ │
│  │  - POST /ai/query                                 │ │
│  │  - GET  /ai/summary                               │ │
│  │  - POST /ingest                                   │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │         Database (PostgreSQL via Supabase)         │ │
│  │         AI Service (Gemini API)                    │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## API Functions Available

```javascript
// Import the API service
import {
  checkHealth, // Check backend health
  getLogs, // Get logs from time range
  getMetrics, // Get system metrics
  compareLogsPeriods, // Compare healthy vs crash periods
  queryAI, // Query AI assistant
  getSummary, // Get AI summary
  ingestLog, // Submit a log event
} from "./services/api";

// Use in components
const metrics = await getMetrics();
const logs = await getLogs(startTime, endTime, limit);
const result = await compareLogsPeriods(healthyTime, crashTime);
const answer = await queryAI("What's wrong with my logs?");
```

## Getting Started

### Quick Start (One Command)

```powershell
cd C:\Users\seril\OneDrive\Desktop\LogFlow\LogFlow
.\start-dev.bat
```

### Manual Start (Two Terminals)

**Terminal 1 - Backend:**

```powershell
cd C:\Users\seril\OneDrive\Desktop\LogFlow\LogFlow
$env:GEMINI_API_KEY="YOUR_API_KEY"
$env:DATABASE_URL="YOUR_DATABASE_URL"
go run ./cmd/server/main.go
```

**Terminal 2 - Frontend:**

```powershell
cd C:\Users\seril\OneDrive\Desktop\LogFlow\LogFlow\UI
npm run dev
```

### Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health Check: http://localhost:8080/health

## Features Connected

✅ **Time-Travel Debugger** - Compare log periods between healthy and crash states
✅ **AI Assistant** - Query the AI about your logs
✅ **System Metrics** - Real-time metrics display (updates every 5 seconds)
✅ **Live Logs** - Sidebar showing latest logs
✅ **Health Monitoring** - Automatic health checks every 5 seconds

## Technical Details

### Development Mode

- Vite automatically proxies `/api/*` requests to `http://localhost:8080/*`
- CORS is handled by backend middleware
- API base URL from `process.env.REACT_APP_API_URL` or defaults to `http://localhost:8080`

### Production Mode

- Update `.env` with production backend URL
- Build frontend: `npm run build`
- Deploy `dist/` folder to your hosting

### Error Handling

- All API errors are caught and logged
- Components handle failures gracefully
- User-friendly error messages

## File Changes Summary

**Created (New Files):**

- ✅ `UI/src/services/api.js` - API service layer
- ✅ `UI/.env.example` - Environment template
- ✅ `FRONTEND_BACKEND_CONNECTION.md` - Setup guide
- ✅ `CONNECTION_SETUP_SUMMARY.md` - Summary
- ✅ `QUICK_REFERENCE.md` - Quick ref
- ✅ `DEVELOPMENT_CHECKLIST.md` - Checklist

**Updated (Modified Files):**

- ✅ `UI/src/App.jsx` - Now uses API service
- ✅ `UI/src/Dashboard.jsx` - Now uses API service
- ✅ `UI/src/components/LogFlow/Sidebar.jsx` - Now uses API service
- ✅ `UI/src/components/LogFlow/Tabs/TimeTravelDebugger.jsx` - Now uses API service
- ✅ `UI/src/components/LogFlow/Tabs/AiAssistant.jsx` - Now uses API service
- ✅ `UI/src/components/LogFlow/Tabs/SystemMetrics.jsx` - Now uses API service

**No Changes Needed:**

- `vite.config.js` - Proxy already configured ✓
- `cmd/server/main.go` - CORS already enabled ✓

## Testing the Connection

### Test 1: Health Check

```powershell
curl http://localhost:8080/health
```

### Test 2: Browser Console

```javascript
fetch("http://localhost:8080/health")
  .then((r) => r.json())
  .then(console.log);
```

### Test 3: Frontend Components

- Open http://localhost:3000
- Check browser DevTools → Network tab
- Verify API calls are successful (200 status)
- Check Console for any errors

## Troubleshooting

**Connection Refused**

- Check backend is running on port 8080
- Check frontend is running on port 3000

**CORS Errors**

- Backend CORS middleware is enabled
- If still issues, check backend logs

**API 404 Errors**

- Check endpoint name is correct
- Verify Vite proxy is working

**Timeout Errors**

- Backend might be slow
- Check database connection
- Check Gemini API key

See `FRONTEND_BACKEND_CONNECTION.md` for detailed troubleshooting.

## Next Steps

1. ✅ Start the services using `./start-dev.bat` or manual commands
2. ✅ Open http://localhost:3000 in browser
3. ✅ Test the three main features (Debugger, AI, Metrics)
4. ✅ Check browser DevTools Network tab for API calls
5. ✅ Check both terminal outputs for errors

## Resources

- 📖 **Setup Guide**: `FRONTEND_BACKEND_CONNECTION.md`
- 📋 **Quick Ref**: `QUICK_REFERENCE.md`
- ✅ **Checklist**: `DEVELOPMENT_CHECKLIST.md`
- 📊 **Summary**: `CONNECTION_SETUP_SUMMARY.md`

---

**Built with ❤️ for SRE teams and hackathon warriors**

🚀 Happy Debugging! 🚀
