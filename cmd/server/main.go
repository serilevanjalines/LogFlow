package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/serilevanjalines/LogFlow/internal/ai"
)

const SRE_SYSTEM_PROMPT = `
You are LogFlow Sentinel, Senior SRE with 10+ years experience.

Task: Differential Log Analysis between HEALTHY vs CRASH periods.

Rules:
1. Find EXACT divergence timestamp
2. Correlate latency spikes across services
3. Silent failure detection
4. Confidence score (0-100%)
5. 3-step remediation

Output Markdown:
## Root Cause (Confidence: XX%)
## Evidence
## Remediation Steps
`

type LogEvent struct {
	ID        int64                  `json:"id,omitempty"`
	Service   string                 `json:"service"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Timestamp string                 `json:"timestamp"`
	Route     string                 `json:"route,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt string                 `json:"created_at,omitempty"`
}

var (
	db           *sql.DB
	geminiClient *ai.Client
)

func getLogsInTimeRange(startTime, endTime time.Time, limit int) []LogEvent {
	query := `
        SELECT id, timestamp, service, level, route, message, metadata, created_at
        FROM logs WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC LIMIT $3
    `

	rows, err := db.Query(query, startTime, endTime, limit)
	if err != nil {
		log.Printf("Query error: %v", err)
		return nil
	}
	defer rows.Close()

	var logs []LogEvent
	for rows.Next() {
		var evt LogEvent
		var ts, createdAt time.Time
		var metadataJSON []byte
		var route sql.NullString

		err := rows.Scan(&evt.ID, &ts, &evt.Service, &evt.Level, &route, &evt.Message, &metadataJSON, &createdAt)
		if err != nil {
			continue
		}

		evt.Timestamp = ts.Format(time.RFC3339)
		if route.Valid {
			evt.Route = route.String
		}
		logs = append(logs, evt)
	}
	return logs
}

func formatLogsForAI(logs []LogEvent) string {
	var sb strings.Builder
	for _, log := range logs {
		sb.WriteString(fmt.Sprintf("[%s] %s %s: %s\n", log.Timestamp, log.Service, log.Level, log.Message))
	}
	return sb.String()
}

// Initialize database connection
func initDB() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return fmt.Errorf("DATABASE_URL environment variable not set")
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	log.Println("✅ Connected to Supabase PostgreSQL!")
	return nil
}

func timeCompareHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "GET only", 405)
		return
	}

	healthy := r.URL.Query().Get("healthy")
	crash := r.URL.Query().Get("crash")

	if healthy == "" || crash == "" {
		http.Error(w, "healthy & crash params required", 400)
		return
	}

	// Use recent data from your logs (Jan 24)
	healthyTime, _ := time.Parse(time.RFC3339, healthy)
	crashTime, _ := time.Parse(time.RFC3339, crash)

	duration := 7 * time.Minute // 7 minutes

	healthyLogs := getLogsInTimeRange(healthyTime, healthyTime.Add(duration), 25)
	crashLogs := getLogsInTimeRange(crashTime, crashTime.Add(duration), 25)

	// Skip if no data
	if len(healthyLogs) == 0 && len(crashLogs) == 0 {
		http.Error(w, "No logs found in time ranges", 404)
		return
	}

	prompt := fmt.Sprintf(`%s

HEALTHY PERIOD (%s):
%d logs
%s

CRASH PERIOD (%s):
%d logs
%s`, SRE_SYSTEM_PROMPT, healthy, len(healthyLogs), formatLogsForAI(healthyLogs), crash, len(crashLogs), formatLogsForAI(crashLogs))

	analysis, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("Gemini error: %v", err)
		http.Error(w, "AI analysis failed", 500)
		return
	}

	// FIXED: Use interface{} map
	response := map[string]interface{}{
		"analysis":      analysis,
		"healthy_count": len(healthyLogs),
		"crash_count":   len(crashLogs),
		"healthy_start": healthy,
		"crash_start":   crash,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Load environment variables from project root
	if err := godotenv.Load("../../.env"); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("⚠️  .env file not found, using system environment variables")
		}
	}

	// Initialize database
	if err := initDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize Gemini client
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY not set in environment")
	}
	geminiClient = ai.NewClient(apiKey)
	log.Println("✅ Gemini AI client initialized")

	// Register handlers
	http.HandleFunc("/ingest", ingestHandler)
	http.HandleFunc("/ai/compare", timeCompareHandler)
	http.HandleFunc("/logs", logsHandler)
	http.HandleFunc("/metrics", metricsHandler)
	http.HandleFunc("/ai/query", aiQueryHandler)
	http.HandleFunc("/ai/summary", aiSummaryHandler)
	http.HandleFunc("/health", healthHandler)
	// Start background monitoring
	go monitorErrorRate()
	log.Println("🚀 LogFlow server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// POST /ingest - Store log in database
// POST /ingest - Store log in database
func ingestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var evt LogEvent
	if err := json.NewDecoder(r.Body).Decode(&evt); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Set timestamp if not provided
	if evt.Timestamp == "" {
		evt.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	// Parse timestamp
	ts, err := time.Parse(time.RFC3339, evt.Timestamp)
	if err != nil {
		http.Error(w, "Invalid timestamp format", http.StatusBadRequest)
		return
	}

	// Handle metadata - convert to JSONB or NULL
	var metadataJSON interface{}
	if len(evt.Metadata) > 0 {
		metadataBytes, err := json.Marshal(evt.Metadata)
		if err != nil {
			http.Error(w, "Invalid metadata", http.StatusBadRequest)
			return
		}
		metadataJSON = metadataBytes
	} else {
		metadataJSON = nil // ✅ Explicitly set to NULL
	}

	// Insert into database
	query := `
		INSERT INTO logs (timestamp, service, level, route, message, metadata)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	var createdAt time.Time
	err = db.QueryRow(
		query,
		ts,
		evt.Service,
		evt.Level,
		sql.NullString{String: evt.Route, Valid: evt.Route != ""}, // Handle empty route
		evt.Message,
		metadataJSON,
	).Scan(&evt.ID, &createdAt)

	if err != nil {
		log.Printf("❌ Error inserting log: %v", err)
		http.Error(w, "Error storing log", http.StatusInternalServerError)
		return
	}

	evt.CreatedAt = createdAt.Format(time.RFC3339)
	log.Printf("✅ STORED: ID=%d, Service=%s, Level=%s", evt.ID, evt.Service, evt.Level)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"id":     evt.ID,
	})
}

// GET /metrics - System metrics
func metricsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get counts by level
	query := `
		SELECT
			level,
			COUNT(*) as count
		FROM logs
		GROUP BY level
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Error querying metrics", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	metrics := make(map[string]int)
	for rows.Next() {
		var level string
		var count int
		rows.Scan(&level, &count)
		metrics[level] = count
	}

	// Get top services
	serviceQuery := `
		SELECT
			service,
			COUNT(*) as count
		FROM logs
		GROUP BY service
		ORDER BY count DESC
		LIMIT 5
	`

	rows2, err := db.Query(serviceQuery)
	if err != nil {
		http.Error(w, "Error querying services", http.StatusInternalServerError)
		return
	}
	defer rows2.Close()

	topServices := make(map[string]int)
	for rows2.Next() {
		var service string
		var count int
		rows2.Scan(&service, &count)
		topServices[service] = count
	}

	response := map[string]interface{}{
		"log_counts":   metrics,
		"top_services": topServices,
		"timestamp":    time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Background job: Check error rate every minute
func monitorErrorRate() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		// Get error count in last 5 minutes
		query := `
			SELECT COUNT(*) as errors
			FROM logs
			WHERE level = 'ERROR'
			AND timestamp > NOW() - INTERVAL '5 minutes'
		`

		var errorCount int
		err := db.QueryRow(query).Scan(&errorCount)
		if err != nil {
			log.Printf("Error checking error rate: %v", err)
			continue
		}

		// Alert if > 10 errors in 5 min
		if errorCount > 10 {
			log.Printf("🚨 ALERT: High error rate detected! %d errors in last 5 minutes", errorCount)
			// Could send to Slack, email, etc.
		}
	}
}

// GET /logs - Query logs from database
func logsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	serviceFilter := r.URL.Query().Get("service")
	levelFilter := r.URL.Query().Get("level")
	routeFilter := r.URL.Query().Get("route")
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "100"
	}

	// Build query
	query := `
		SELECT id, timestamp, service, level, route, message, metadata, created_at
		FROM logs
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if serviceFilter != "" {
		query += fmt.Sprintf(" AND service = $%d", argCount)
		args = append(args, serviceFilter)
		argCount++
	}

	if levelFilter != "" {
		query += fmt.Sprintf(" AND level = $%d", argCount)
		args = append(args, levelFilter)
		argCount++
	}

	if routeFilter != "" {
		query += fmt.Sprintf(" AND route = $%d", argCount)
		args = append(args, routeFilter)
		argCount++
	}

	if fromStr != "" {
		if fromTime, err := time.Parse(time.RFC3339, fromStr); err == nil {
			query += fmt.Sprintf(" AND timestamp >= $%d", argCount)
			args = append(args, fromTime)
			argCount++
		}
	}

	if toStr != "" {
		if toTime, err := time.Parse(time.RFC3339, toStr); err == nil {
			query += fmt.Sprintf(" AND timestamp <= $%d", argCount)
			args = append(args, toTime)
			argCount++
		}
	}

	query += " ORDER BY timestamp DESC"
	query += fmt.Sprintf(" LIMIT $%d", argCount)
	args = append(args, limit)

	// Execute query
	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ Error querying logs: %v", err)
		http.Error(w, "Error querying logs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Parse results
	var logs []LogEvent
	for rows.Next() {
		var evt LogEvent
		var timestamp, createdAt time.Time
		var metadataJSON []byte
		var route sql.NullString

		err := rows.Scan(
			&evt.ID,
			&timestamp,
			&evt.Service,
			&evt.Level,
			&route,
			&evt.Message,
			&metadataJSON,
			&createdAt,
		)
		if err != nil {
			log.Printf("❌ Error scanning row: %v", err)
			continue
		}

		evt.Timestamp = timestamp.Format(time.RFC3339)
		evt.CreatedAt = createdAt.Format(time.RFC3339)

		if route.Valid {
			evt.Route = route.String
		}

		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &evt.Metadata)
		}

		logs = append(logs, evt)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"count": len(logs),
		"logs":  logs,
	})
}

// AI Query Handler
type AIQueryRequest struct {
	Question string `json:"question"`
	Service  string `json:"service,omitempty"`
	Level    string `json:"level,omitempty"`
}

type AIQueryResponse struct {
	Answer       string     `json:"answer"`
	RelevantLogs []LogEvent `json:"relevant_logs"`
	LogCount     int        `json:"log_count"`
}

func aiQueryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AIQueryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Question == "" {
		http.Error(w, "Question is required", http.StatusBadRequest)
		return
	}

	// Query logs from database
	query := `
		SELECT id, timestamp, service, level, route, message, metadata, created_at
		FROM logs
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if req.Service != "" {
		query += fmt.Sprintf(" AND service = $%d", argCount)
		args = append(args, req.Service)
		argCount++
	}

	if req.Level != "" {
		query += fmt.Sprintf(" AND level = $%d", argCount)
		args = append(args, req.Level)
		argCount++
	}

	query += " ORDER BY timestamp DESC LIMIT 20"

	rows, err := db.Query(query, args...)
	if err != nil {
		log.Printf("❌ Error querying logs: %v", err)
		http.Error(w, "Error querying logs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var relevantLogs []LogEvent
	context := ""

	for rows.Next() {
		var evt LogEvent
		var timestamp, createdAt time.Time
		var metadataJSON []byte
		var route sql.NullString

		err := rows.Scan(
			&evt.ID,
			&timestamp,
			&evt.Service,
			&evt.Level,
			&route,
			&evt.Message,
			&metadataJSON,
			&createdAt,
		)
		if err != nil {
			continue
		}

		evt.Timestamp = timestamp.Format(time.RFC3339)
		if route.Valid {
			evt.Route = route.String
		}

		relevantLogs = append(relevantLogs, evt)
		context += fmt.Sprintf("[%s] Service: %s, Level: %s, Message: %s\n",
			evt.Timestamp, evt.Service, evt.Level, evt.Message)
	}

	prompt := fmt.Sprintf(`You are an expert SRE assistant analyzing application logs.

Context (Recent Logs):
%s

User Question: %s

Please provide a concise answer based on the logs above.`, context, req.Question)

	answer, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("❌ Gemini API error: %v", err)
		http.Error(w, "Failed to query AI", http.StatusInternalServerError)
		return
	}

	response := AIQueryResponse{
		Answer:       answer,
		RelevantLogs: relevantLogs,
		LogCount:     len(relevantLogs),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("✅ AI Query answered: %s", req.Question)
}

// AI Summary Handler
type AISummaryResponse struct {
	Summary      string         `json:"summary"`
	TotalLogs    int            `json:"total_logs"`
	ErrorCount   int            `json:"error_count"`
	WarningCount int            `json:"warning_count"`
	InfoCount    int            `json:"info_count"`
	TopServices  map[string]int `json:"top_services"`
}

func aiSummaryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get statistics from database
	statsQuery := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as errors,
			COUNT(CASE WHEN level = 'WARN' OR level = 'WARNING' THEN 1 END) as warnings,
			COUNT(CASE WHEN level = 'INFO' THEN 1 END) as info
		FROM logs
	`

	var totalLogs, errorCount, warningCount, infoCount int
	err := db.QueryRow(statsQuery).Scan(&totalLogs, &errorCount, &warningCount, &infoCount)
	if err != nil {
		http.Error(w, "Error getting statistics", http.StatusInternalServerError)
		return
	}

	// Get top services
	serviceQuery := `
		SELECT service, COUNT(*) as count
		FROM logs
		GROUP BY service
		ORDER BY count DESC
		LIMIT 5
	`

	rows, err := db.Query(serviceQuery)
	if err != nil {
		http.Error(w, "Error querying services", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	topServices := make(map[string]int)
	for rows.Next() {
		var service string
		var count int
		rows.Scan(&service, &count)
		topServices[service] = count
	}

	context := fmt.Sprintf(`Log Statistics:
- Total logs: %d
- Errors: %d
- Warnings: %d
- Info: %d

Top Services:`, totalLogs, errorCount, warningCount, infoCount)

	for service, count := range topServices {
		context += fmt.Sprintf("\n- %s: %d logs", service, count)
	}

	prompt := fmt.Sprintf(`You are an expert SRE assistant. Analyze these log statistics and provide:
1. A brief incident summary
2. The most likely root cause
3. Three specific actions to investigate

%s`, context)

	summary, err := geminiClient.Query(prompt)
	if err != nil {
		http.Error(w, "Failed to generate summary", http.StatusInternalServerError)
		return
	}

	response := AISummaryResponse{
		Summary:      summary,
		TotalLogs:    totalLogs,
		ErrorCount:   errorCount,
		WarningCount: warningCount,
		InfoCount:    infoCount,
		TopServices:  topServices,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Printf("✅ AI Summary generated")
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	if err := db.Ping(); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(map[string]string{
			"status":   "unhealthy",
			"database": "disconnected",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":   "healthy",
		"database": "connected",
	})
}
