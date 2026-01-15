# LogFlow - AI-Powered Log Analysis System

> Transforming logs into actionable insights with Google Gemini 3 AI

LogFlow is a developer-focused log aggregation and analysis platform that ships structured logs to a central Go backend and provides AI-powered natural language querying and automated incident summaries.

[![Go Version](https://img.shields.io/badge/Go-1.20+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🚀 Features

### Core Capabilities
- **Real-time Log Ingestion** - High-performance JSON endpoint for structured log collection
- **Intelligent Filtering** - Query logs by service, level, route, and time range
- **Lightweight Agent** - Parses local log files and ships to central server

### AI-Powered Analysis (Gemini 3)
- **Natural Language Queries** - Ask "Why are payment errors increasing?" and get intelligent answers
- **Automated Incident Summaries** - Generate root cause analysis and actionable remediation steps
- **Context-Aware Analysis** - AI understands log patterns and correlates errors across services

---

## 🏗️ Architecture
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Agent     │         │   Server     │         │  Gemini 3   │
│  (Parses)   │──POST──▶│  (Filters &  │──API───▶│    API      │
│   app.log   │ /ingest │  Analyzes)   │  Call   │             │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │ Stores
                               ▼
                        ┌──────────────┐
                        │  In-Memory   │
                        │    Storage   │
                        └──────────────┘

undefined
---

## 📦 Tech Stack

- **Backend:** Go (net/http)
- **AI Model:** Google Gemini 3 Flash Preview
- **Storage:** In-memory (SQLite/Postgres planned)
- **Dependencies:** godotenv, Gemini API SDK

---

## 🚦 Quick Start

### Prerequisites
- Go 1.20 or higher
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation
Running
Terminal 1 - Start Server:
Terminal 2 - Start Agent:
Terminal 3 - Test AI Integration:


📡 API Reference

## 📡 API Reference

### POST `/ingest`
Ingest structured log events.

**Request:**
```json
{
  "Service": "payments",
  "Level": "ERROR",
  "Message": "payment failed",
  "Route": "/checkout"
}
Response: 200 OK

GET /logs
Query stored logs with filters.

Query Parameters:

service - Filter by service name

level - Filter by level (INFO, ERROR, WARN)

route - Filter by route

from - Start time (RFC3339)

to - End time (RFC3339)

Example:curl "http://localhost:8080/logs?service=payments&level=ERROR"


Example:
🤖 How We Use Gemini 3
LogFlow integrates Google Gemini 3 Flash as an intelligent reasoning layer:

Context Aggregation - Filters and compresses logs into structured statistics

Prompt Engineering - System prompts define SRE assistant role and output format

RAG Pattern - Retrieves relevant logs first, then augments with AI insights

Token Optimization - Sends max 20 logs per query to minimize API costs

Structured Responses - Returns JSON with answer, evidence, and log references

The Gemini 3 Flash model provides low-latency responses ideal for real-time incident triage.

📁 Project Structure
<img width="640" height="576" alt="image" src="https://github.com/user-attachments/assets/f48cfa34-f259-4c04-9499-3de76587d6a5" />

The project is still in WIP :) @Jan 15 2026
