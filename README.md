# LogFlow - Gemini 3 SRE Observability Dashboard

**Next-generation, multimodal AI log analysis powered by Google Gemini 3.**

![Status](https://img.shields.io/badge/status-active-success)
![Go](https://img.shields.io/badge/Go-1.x-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%203-4285F4)

---

## 🎯 Overview

LogFlow is a high-performance SRE observability platform built for the **Google Gemini 3 Global Hackathon**. It combines real-time log monitoring with cutting-edge **Multimodal Vision Analysis**. It allows SREs to upload their infrastructure architecture diagrams and have the Gemini 3 engine "see" the relationship between services while debugging log failures.

The interface follows a professional **Enterprise Elite** design system: a clean, high-contrast white palette with Royal Blue accents, optimized for mission-critical dashboards.

---

## ✨ Winning Features (Judge Highlights)

- 📸 **Multimodal Architecture Vision**: Upload a JPEG/PNG diagram of your system. Gemini 3 analyzes your infrastructure hierarchy to identify bottleneck dependencies that text-only models would miss.
- 🕐 **Time-Travel Debugger**: Instantly compare logs from two different periods (Healthy vs. Crash) using Gemini 3's advanced differential reasoning.
- 📄 **One-Click SRE Reports**: Generate professional, branded PDF incident reports directly from AI insights—ready to hand to management.
- 🤖 **AI Assistant**: Natural language chat interface with context-aware log retrieval and Truth-Citations.
- 🛡️ **PII Scrubber**: High-performance Go-based sanitizer automatically masks IPs and Emails before data ever reaches the AI model.
- 📍 **Truth-Citations (No-Hallucination)**: AI cites specific Log IDs which are automatically highlighted and scrolled to in the UI to prove data accuracy.

---

## 🏗️ Tech Stack

### Backend
- **Go (Golang)**: High-performance concurrent REST API and log ingestion.
- **PostgreSQL**: Cloud-hosted persistent database for log storage.
- **Gemini 3 API**: Utilizing the latest `gemini-3-flash-preview` via the `v1beta` endpoint for multimodal vision and reasoning.

### Frontend
- **React 18 & Vite**: Lightning-fast architecture with responsive state management.
- **Vanilla CSS**: Bespoke "Enterprise Elite" styling with high-performance animations.
- **Truth-Sync Engine**: Custom logic to synchronize AI analysis timestamps with physical log sidebar positions.

---

## 🚀 Getting Started

### 1. Environment Configuration
Create an `e.txt` (or `.env`) file in the root directory:
```
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@host:6543/postgres
PORT=8080
```

### 2. Start the Backend
Terminal 1:
```powershell
go run ./cmd/server/main.go
```

### 3. Start the Log Agent (Generator)
Terminal 2:
```powershell
go run ./cmd/agent/main.go
```

### 4. Start the Frontend
Terminal 3:
```powershell
cd UI
npm install
npm run dev
```

---

## 🛡️ Hackathon Special: Verification Guide

### **1. Multimodal Architecture Mapping**
- **Action**: Go to the **Time-Travel** tab.
- **Action**: Upload any architecture diagram (even a simple sketch of microservices).
- **Observation**: Gemini 3 will reference your diagram in its "Security Analysis" to explain *why* a failure in Service A is impacting Service B based on the visual links.

### **2. Truth-Citation System**
- **Action**: Click any blue reference like `[Log #37651]` inside an AI response.
- **Result**: The sidebar will **instantly scroll** to that log and start a **Royal Blue pulsing glow**, proving zero AI hallucination.

### **3. Enterprise PDF Export**
- **Action**: Click "Export Report (PDF)" after an analysis.
- **Result**: A professional SRE document is generated in a new tab, formatted for corporate distribution.

---

## 📝 License

MIT License. Built with ❤️ for the Google Gemini 3 Hackathon.
