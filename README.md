# LogFlow - SRE Observability Dashboard

**Real-time log analysis and time-travel debugging powered by AI.**

![Status](https://img.shields.io/badge/status-active-success)
![Go](https://img.shields.io/badge/Go-1.x-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%203-4285F4)

---

## 🎯 Overview

LogFlow is a high-performance SRE observability platform that combines real-time log monitoring with AI-powered differential analysis. It features a revolutionary **Time-Travel Debugger** that compares healthy and crash periods to identify root causes instantly using the **Gemini 3 API**.

The interface follows a professional **Enterprise Elite** design system: a clean, high-contrast white palette with professional SVG iconography and zero emoji clutter.

---

## ✨ Key Features

- 🕐 **Time-Travel Debugger**: Compare logs from two different time periods (Healthy vs. Crash) with AI-powered differential analysis.
- 🤖 **AI Assistant**: Natural language chat interface optimized for SRE queries, providing root cause analysis and remediation steps.
- 📊 **Unified Metrics**: Real-time monitoring of error rates, log volumes, and service health status.
- 📉 **Live Error Feed**: A dedicated sidebar tracking system-wide errors as they happen.
- 🛡️ **Security Insights**: Integrated security analysis focused on distributed system anomalies and credential dependencies.

---

## 🏗️ Tech Stack

### Backend
- **Go (Golang)**: High-performance HTTP server and log ingestion.
- **PostgreSQL (Supabase)**: Cloud-hosted database for persistent log storage.
- **Gemini 3 API**: The latest high-performance AI model for log reasoning and SRE insights.

### Frontend
- **React 18 & Vite**: Modern, responsive component architecture with lightning-fast build times.
- **Vanilla CSS**: Bespoke "Enterprise Elite" styling with a clean white palette, Royal Blue accents, and high-performance animations.
- **Lucide-Style SVG Icons**: Unified, professional outline iconography set.

---

## 🚀 Getting Started

### Prerequisites
- **Go 1.x**
- **Node.js 18+**
- **Gemini API Key** ([Google AI Studio](https://aistudio.google.com/))
- **Supabase PostgreSQL URL**

### 1. Project Setup
```powershell
git clone <your-repo-url>
cd LogFlow
```

### 2. Environment Configuration
Create an `e.txt` (or `.env`) file in the root directory:
```
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@host:6543/postgres
PORT=8080
```

### 3. Start the Backend
Terminal 1:
```powershell
go run ./cmd/server/main.go
```

### 4. Start the Log Agent (Generator)
Terminal 2:
```powershell
go run ./cmd/agent/main.go
```

### 5. Start the Frontend
Terminal 3:
```powershell
cd UI
npm install
npm run dev
```

Access the dashboard at **http://localhost:3000**.

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

## 🎯 Project Structure

```
LogFlow/
├── cmd/
│   ├── server/main.go          # REST API & AI Orchestration
│   └── agent/main.go            # Log Generation Agent
├── internal/
│   └── ai/gemini.go             # Gemini API Client
├── UI/
│   ├── src/
│   │   ├── components/LogFlow/
│   │   │   ├── Header.jsx       # Status Pill & Branding
│   │   │   ├── Sidebar.jsx      # LIVE ERROR FEED
│   │   │   ├── MainContent.jsx  # Tab Orchestration
│   │   │   └── Tabs/
│   │   │       ├── TimeTravelDebugger.jsx
│   │   │       ├── AiAssistant.jsx
│   │   │       └── SystemMetrics.jsx
│   │   ├── services/api.js      # Centralized API Service
│   │   └── styles/logflow.css   # Global Corporate Styles
│   └── vite.config.js           # Proxy configuration
├── e.txt                        # Env variables (ignored by git)
└── README.md                    # This file
```

---

## 🛡️ Corporate Compliance & Style

- **No Emojis**: The interface and AI responses follow a strict professional standard using text labels and SVG icons.
- **White Palette**: High-contrast, clean corporate aesthetic for reduced cognitive load.
- **Differential Reasoning**: AI is tuned to focus on *evidence-based* root cause identification.
- **PII Scrubbing**: Automatic masking of sensitive data (IPs, Emails, CCs) before AI analysis.
- **Truth-Citations**: AI cites specific Log IDs which are automatically highlighted in the UI to prevent hallucinations.

---

## 🛡️ Privacy & Security (Hackathon Special)

LogFlow includes a high-performance **Go-based PII Scrubber** and a **Truth-Citation System** to ensure data privacy and AI reliability.

### **How to Verify the High-Performance Features:**

#### 1. PII Scrubber
- **Prompt**: *"Show me the recent login logs including IP addresses"*
- **Observation**: Gemini analyzes the logs but only sees/reports sanitized tokens like `[IP_MASKED]`.

#### 2. Truth-Citation System (No-Hallucination Proof)
- **Action**: Run a **Time-Travel Comparison**.
- **Observation**: When Gemini identifies a root cause, check for references like `[Log #123]`.
- **Result**: The UI will **automatically scroll to and highlight** that exact log line in the sidebar with a pulsing glow, proving the AI is reading real data.

---

## 📝 License

MIT License. Built with ❤️ for SRE Teams and Observability Enthusiasts.
