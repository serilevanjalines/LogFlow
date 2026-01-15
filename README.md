# LogFlow - AI-Powered Log Analysis System

> Transforming logs into actionable insights with Google Gemini 3 AI

LogFlow is a developer-focused log aggregation and analysis platform that ships structured logs to a central Go backend and provides AI-powered natural language querying and automated incident summaries.

[![Go Version](https://img.shields.io/badge/Go-1.20+-00ADD8?style=flat&logo=go)](https://go.dev/)\
[![Status](https://img.shields.io/badge/status-WIP-yellow.svg)](https://github.com/serilevanjalines/LogFlow)

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

# Clone repository
git clone https://github.com/serilevanjalines/LogFlow.git
cd LogFlow

# Install dependencies
go mod tidy

# Create .env file
echo "GEMINI_API_KEY=your_api_key_here" > .env

Running
Terminal 1 - Start Server:
go run ./cmd/server/main.go
# Server starts on http://localhost:8080

Terminal 2 - Start Agent:
go run ./cmd/agent/main.go
# Agent reads app.log and ships to server

Terminal 3 - Test AI Integration:
go run test_gemini.go

🤖 How We Use Gemini 3
LogFlow integrates Google Gemini 3 Flash as an intelligent reasoning layer:

Context Aggregation - Filters and compresses logs into structured statistics

Prompt Engineering - System prompts define SRE assistant role and output format

RAG Pattern - Retrieves relevant logs first, then augments with AI insights

Token Optimization - Sends max 20 logs per query to minimize API costs

Structured Responses - Returns JSON with answer, evidence, and log references

The Gemini 3 Flash model provides low-latency responses ideal for real-time incident triage.


