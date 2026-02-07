# LogFlow: Advanced Cloud Observability and AI Diagnostics

LogFlow is a high-performance observability platform designed for automated incident response and proactive system monitoring. By integrating large language model reasoning with traditional telemetry data, LogFlow provides security-conscious, real-time diagnostics for complex distributed systems.

## Core Capabilities

### 1. Differential System Analysis
LogFlow implements a "Time-Travel" debugger that allows operators to contrast system states between arbitrary timestamps. The platform performs a statistical and semantic differentiation of log data to identify the transition from nominal operation to service degradation.

### 2. Multimodal Infrastructure Reasoning
The platform utilizes the Google Gemini 1.5 Flash model to interpret infrastructure architecture diagrams. By correlating visual dependency maps with incoming telemetry, LogFlow identifies potential cascading failures across service boundaries that traditional rule-based systems might overlook.

### 3. High-Concurrency Telemetry Ingestion
Built in Go, the LogFlow backend is optimized for high-throughput ingestion. It features a non-blocking architecture capable of processing thousands of log events per second while maintaining persistent storage integrity.

### 4. PII Scrubbing and Security Compliance
To ensure enterprise-grade security and compliance (GDPR/SOC2 readiness), the backend automatically identifies and redacts Personally Identifiable Information (PII) such as email addresses, IP addresses, and API credentials before data is transmitted for AI analysis.

### 5. Automated Root Cause Analysis (RCA)
The integrated AI assistant provides real-time, context-aware diagnostics. Every diagnosis is backed by deterministic log citations, allowing human operators to verify AI-generated insights against the raw underlying data.

## Technical Architecture

The system is partitioned into three primary architectural tiers:

- **Ingestion Tier (Go Sentinel)**: A high-performance REST API developed in Go, responsible for log ingestion, data sanitization, and service orchestration.
- **Persistence Tier (PostgreSQL)**: A robust storage layer utilizing PostgreSQL (via Supabase) for low-latency retrieval of log events and system metadata.
- **Presentation Tier (React/Vite)**: A sophisticated web interface optimized for SRE workflows, providing real-time data visualization and interactive diagnostic tools.

## Live Deployment

The platform is deployed across a distributed cloud environment:

- **Primary Dashboard**: [https://logflow-psi.vercel.app/](https://logflow-psi.vercel.app/)
- **API Terminal**: [https://logflow-api.onrender.com](https://logflow-api.onrender.com)
- **Service Verification**: [https://logflow-api.onrender.com/health](https://logflow-api.onrender.com/health)

## Operational Setup

### Containerized Deployment
The entire stack can be initialized using the provided Docker orchestration:
```bash
docker-compose up --build
```

### Manual Configuration

#### Backend Initialization
1. Ensure a PostgreSQL instance is available via `DATABASE_URL`.
2. Configure `GEMINI_API_KEY` in the environment.
3. Execute the binary:
   ```bash
   go run ./cmd/server/main.go
   ```

#### Telemetry Agent
To simulate a production workload or connect an existing service:
```bash
export SERVER_URL="https://logflow-api.onrender.com"
go run ./cmd/agent/main.go
```

#### Frontend Initialization
1. Navigate to the `UI` directory.
2. Install dependencies: `npm install`
3. Launch the development server: `npm run dev`

## Security and Integrity
LogFlow maintains an immutable record of system events. The AI analysis layer is strictly decoupled from the primary data ingestion path to prevent diagnostic processing from impacting system observability.
