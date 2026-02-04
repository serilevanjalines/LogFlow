package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/serilevanjalines/LogFlow/internal/ai"
)

const SRE_SYSTEM_PROMPT = `You are LogFlow, Senior SRE with 15+ years of experience in distributed systems debugging.

TASK: Perform differential log analysis between HEALTHY and CRASH periods.

YOUR OUTPUT FORMAT (PLAIN TEXT - NO MARKDOWN):

ROOT CAUSE (Confidence: XX%)
- Clear one-liner description of the issue
- Expected impact on users/services

EVIDENCE
Provide 3 specific indicators that support your diagnosis:

1. EXACT DIVERGENCE TIMESTAMP
- Specify the EXACT moment where behavior changed
- Format: 2026-02-04T04:36:17Z

2. SERVICE IMPACT MAP
- Affected Services: [list with correlation]
- Latency pattern: [describe what you observe]
- Error distribution: [compare healthy vs crash]

3. SILENT FAILURES & ANOMALIES
- Architectural Smell: [what's wrong with the design]
- Log Suppression: [what stopped reporting]
- Any timing correlations

ACTIONABLE REMEDIATION (Priority Order)
Provide exactly 3 steps in order of urgency:

CRITICAL (Immediate)
- Action: [specific command/change]
- Why: [brief technical reason]
- Expected result: [measurable outcome]

HIGH (Within 1 hour)
- Action: [specific command/change]
- Why: [brief technical reason]
- Expected result: [measurable outcome]

MEDIUM (Within 24 hours)
- Action: [specific command/change]
- Why: [brief technical reason]
- Expected result: [measurable outcome]

CRITICAL RULES:
- Use PLAIN TEXT ONLY - NO markdown symbols like ** or ##
- Be specific: avoid vague language
- Use exact timestamps from logs
- Developers need commands they can copy-paste
- If confidence < 70%, explicitly state data limitations
- Add line breaks between sections for readability`

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
	// 🔍 DEBUG: Log the query range with full timestamp info
	log.Printf("🔍 DB QUERY: %s → %s (UTC)", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))
	log.Printf("   Start: %v | End: %v", startTime.Unix(), endTime.Unix())

	query := `
        SELECT id, service, level, route, message, metadata, timestamp, created_at
        FROM logs WHERE timestamp BETWEEN $1 AND $2 ORDER BY timestamp DESC LIMIT $3
    `

	rows, err := db.Query(query, startTime, endTime, limit)
	if err != nil {
		log.Printf("❌ Query error: %v", err)
		return nil
	}
	defer rows.Close()

	var logs []LogEvent
	for rows.Next() {
		var evt LogEvent
		var metadataJSON []byte
		var route sql.NullString
		var ts, createdAt time.Time // ✅ DECLARE ALL FIRST

		// ✅ FIXED ORDER: id, service, level, route, message, metadata, timestamp, created_at
		err := rows.Scan(&evt.ID, &evt.Service, &evt.Level, &route, &evt.Message, &metadataJSON, &ts, &createdAt)
		if err != nil {
			log.Printf("❌ Scan error: %v", err)
			continue
		}

		evt.Timestamp = ts.Format(time.RFC3339)
		if route.Valid {
			evt.Route = route.String
		}
		if len(metadataJSON) > 0 {
			json.Unmarshal(metadataJSON, &evt.Metadata)
		}
		evt.CreatedAt = createdAt.Format(time.RFC3339)
		logs = append(logs, evt)
	}

	// 📊 DEBUG: Report how many logs were found
	log.Printf("📊 TOTAL LOGS in range [%s, %s]: %d", startTime.Format("15:04:05"), endTime.Format("15:04:05"), len(logs))

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

	// Ensure simple protocol for pooled Postgres (avoids prepared statement errors)
	if parsedURL, err := url.Parse(dbURL); err == nil {
		query := parsedURL.Query()
		if query.Get("simple_protocol") == "" {
			query.Set("simple_protocol", "true")
			parsedURL.RawQuery = query.Encode()
			dbURL = parsedURL.String()
		}
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

	// 🔧 FLEXIBLE PARSING: datetime-local OR RFC3339
	healthyTime, err := parseFlexibleTime(healthy)
	if err != nil {
		log.Printf("❌ Invalid healthy time '%s': %v", healthy, err)
		http.Error(w, fmt.Sprintf("Invalid healthy time: %s", healthy), 400)
		return
	}

	crashTime, err := parseFlexibleTime(crash)
	if err != nil {
		log.Printf("❌ Invalid crash time '%s': %v", crash, err)
		http.Error(w, fmt.Sprintf("Invalid crash time: %s", crash), 400)
		return
	}

	// 🕒 DEBUG: Log exact times being queried
	log.Printf("📊 Time-Travel Request:")
	log.Printf("   🟢 Healthy: %s (parsed: %v)", healthy, healthyTime.Format(time.RFC3339))
	log.Printf("   🔴 Crash:   %s (parsed: %v)", crash, crashTime.Format(time.RFC3339))

	duration := 7 * time.Minute // 7 minutes window

	healthyStart := healthyTime
	healthyEnd := healthyTime.Add(duration)
	crashStart := crashTime
	crashEnd := crashTime.Add(duration)

	log.Printf("🔍 Query ranges:")
	log.Printf("   🟢 Healthy window: %s → %s", healthyStart.Format(time.RFC3339), healthyEnd.Format(time.RFC3339))
	log.Printf("   🔴 Crash window:   %s → %s", crashStart.Format(time.RFC3339), crashEnd.Format(time.RFC3339))

	healthyLogs := getLogsInTimeRange(healthyStart, healthyEnd, 25)
	crashLogs := getLogsInTimeRange(crashStart, crashEnd, 25)

	log.Printf("✅ Query complete: healthy=%d logs, crash=%d logs", len(healthyLogs), len(crashLogs))

	// Skip if no data
	if len(healthyLogs) == 0 && len(crashLogs) == 0 {
		log.Printf("🚨 ERROR: No logs found in time ranges!")
		http.Error(w, "No logs found in time ranges", 404)
		return
	}

	prompt := fmt.Sprintf(`%s

HEALTHY PERIOD (%s → %s):
%d logs
%s

CRASH PERIOD (%s → %s):
%d logs
%s`, SRE_SYSTEM_PROMPT,
		healthyStart.Format("2006-01-02 15:04:05"), healthyEnd.Format("15:04:05"),
		len(healthyLogs), formatLogsForAI(healthyLogs),
		crashStart.Format("2006-01-02 15:04:05"), crashEnd.Format("15:04:05"),
		len(crashLogs), formatLogsForAI(crashLogs))

	analysis, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("❌ Gemini error: %v", err)
		http.Error(w, "AI analysis failed", 500)
		return
	}

	response := map[string]interface{}{
		"analysis":      analysis,
		"healthy_count": len(healthyLogs),
		"crash_count":   len(crashLogs),
		"healthy_start": healthyStart.Format(time.RFC3339),
		"crash_start":   crashStart.Format(time.RFC3339),
		"healthy_logs":  len(healthyLogs),
		"crash_logs":    len(crashLogs),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 🔧 NEW: Flexible time parsing (datetime-local OR RFC3339)
func parseFlexibleTime(timeStr string) (time.Time, error) {
	// Try RFC3339 first (Z timezone)
	if t, err := time.Parse(time.RFC3339, timeStr); err == nil {
		return t, nil
	}

	// Try datetime-local format (2006-01-02T15:04 → no seconds/Z)
	if t, err := time.ParseInLocation("2006-01-02T15:04", timeStr, time.UTC); err == nil {
		return t, nil
	}

	// Try with seconds (2006-01-02T15:04:05)
	if t, err := time.ParseInLocation("2006-01-02T15:04:05", timeStr, time.UTC); err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("unrecognized time format: %s", timeStr)
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	// Load environment variables from project root - try multiple paths
	envPaths := []string{
		"../../.env",     // from cmd/server
		".env",           // from project root
		"./LogFlow/.env", // from parent
	}

	loaded := false
	for _, envPath := range envPaths {
		if err := godotenv.Load(envPath); err == nil {
			log.Printf("✅ Loaded .env from: %s", envPath)
			loaded = true
			break
		}
	}

	if !loaded {
		log.Println("⚠️  .env file not found, using system environment variables")
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
	http.HandleFunc("/ingest", corsMiddleware(ingestHandler))
	http.HandleFunc("/ai/compare", corsMiddleware(timeCompareHandler))
	http.HandleFunc("/logs", corsMiddleware(logsHandler))
	http.HandleFunc("/metrics", corsMiddleware(metricsHandler))
	http.HandleFunc("/metrics/advanced", corsMiddleware(advancedMetricsHandler))
	http.HandleFunc("/ai/query", corsMiddleware(aiQueryHandler))
	http.HandleFunc("/ai/summary", corsMiddleware(aiSummaryHandler))
	http.HandleFunc("/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/compare", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/ai/compare?"+r.URL.RawQuery, http.StatusMovedPermanently)
	}))
	// Start background monitoring
	go monitorErrorRate()
	log.Println("🚀 LogFlow server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

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

	// 📝 DEBUG: Log ingestion details
	log.Printf("📝 Ingesting log: Service=%s, Level=%s, Time=%s", evt.Service, evt.Level, ts.Format(time.RFC3339))

	// Handle metadata - convert to JSONB or NULL
	var metadataJSON interface{}
	if len(evt.Metadata) > 0 {
		metadataBytes, err := json.Marshal(evt.Metadata)
		if err != nil {
			log.Printf("⚠️ Invalid metadata, using NULL")
			metadataJSON = nil // ✅ FALLBACK
		} else {
			metadataJSON = metadataBytes
		}
	} else {
		metadataJSON = nil // ✅ MISSING = NULL (no error!)
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
	totalLogs := 0
	errorLogs := 0
	infoLogs := 0
	warnLogs := 0

	for rows.Next() {
		var level string
		var count int
		rows.Scan(&level, &count)

		// Handle both "WARN" and "WARNING"
		normalizedLevel := level
		if level == "WARN" {
			normalizedLevel = "WARNING"
		}

		metrics[normalizedLevel] = count
		totalLogs += count

		if normalizedLevel == "ERROR" {
			errorLogs = count
		}
		if normalizedLevel == "INFO" {
			infoLogs = count
		}
		if normalizedLevel == "WARNING" {
			warnLogs = count
		}
	}

	// Get top services by error count
	serviceQuery := `
		SELECT
			service,
			COUNT(*) as count
		FROM logs
		WHERE level = 'ERROR'
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

	topServices := []map[string]interface{}{}
	for rows2.Next() {
		var service string
		var count int
		rows2.Scan(&service, &count)
		status := "Online"
		if count > 5 {
			status = "Degraded"
		}
		topServices = append(topServices, map[string]interface{}{
			"name":   service,
			"errors": count,
			"status": status,
		})
	}

	// Get all healthy services (services with INFO or no errors)
	allServicesQuery := `
		SELECT DISTINCT service
		FROM logs
		ORDER BY service ASC
	`

	rows3, err := db.Query(allServicesQuery)
	if err != nil {
		http.Error(w, "Error querying all services", http.StatusInternalServerError)
		return
	}
	defer rows3.Close()

	allServices := []map[string]interface{}{}
	errorServiceNames := make(map[string]bool)
	for _, svc := range topServices {
		errorServiceNames[svc["name"].(string)] = true
	}

	for rows3.Next() {
		var service string
		rows3.Scan(&service)
		if !errorServiceNames[service] {
			allServices = append(allServices, map[string]interface{}{
				"name":   service,
				"errors": 0,
				"status": "Online",
			})
		}
	}

	// Combine all services
	allServices = append(allServices, topServices...)

	// Calculate error rate
	errorRate := 0
	if totalLogs > 0 {
		errorRate = (errorLogs * 100) / totalLogs
	}

	// Get unique services count
	uniqueServicesQuery := `SELECT COUNT(DISTINCT service) FROM logs`
	var serviceCount int
	db.QueryRow(uniqueServicesQuery).Scan(&serviceCount)

	// Debug logging
	log.Printf("DEBUG METRICS: errorLogs=%d, infoLogs=%d, warnLogs=%d, totalLogs=%d, errorRate=%d%%", errorLogs, infoLogs, warnLogs, totalLogs, errorRate)
	log.Printf("DEBUG METRICS: metrics map = %v", metrics)

	response := map[string]interface{}{
		"log_counts": map[string]interface{}{
			"ERROR":   errorLogs,
			"INFO":    infoLogs,
			"WARNING": warnLogs,
			"total":   totalLogs,
		},
		"error_rate":      errorRate,
		"top_services":    topServices,
		"all_services":    allServices,
		"unique_services": serviceCount,
		"error_count":     errorLogs,
		"info_count":      infoLogs,
		"warning_count":   warnLogs,
		"avg_latency":     0,
		"timestamp":       time.Now().Format(time.RFC3339),
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
	limitStr := r.URL.Query().Get("limit")
	if limitStr == "" {
		limitStr = "100"
	}

	// ✅ Convert limit to integer
	limit := 100
	if l, err := strconv.Atoi(limitStr); err == nil {
		limit = l
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
	ErrorCount   int        `json:"error_count"`
	TimeRange    string     `json:"time_range"`
	Services     []string   `json:"services"`
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

	log.Printf("🤖 AI Query: '%s'", req.Question)

	// 🧠 Smart time window detection based on question
	var fromTime, toTime time.Time
	var timeDesc string
	toTime = time.Now().UTC()

	questionLower := strings.ToLower(req.Question)

	if strings.Contains(questionLower, "yesterday") {
		// Yesterday: 00:00 to 23:59 of previous day
		yesterday := toTime.AddDate(0, 0, -1)
		fromTime = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 0, 0, 0, 0, time.UTC)
		toTime = time.Date(yesterday.Year(), yesterday.Month(), yesterday.Day(), 23, 59, 59, 0, time.UTC)
		timeDesc = "yesterday"
	} else if strings.Contains(questionLower, "last 24 hour") || strings.Contains(questionLower, "past 24 hour") {
		fromTime = toTime.Add(-24 * time.Hour)
		timeDesc = "last 24 hours"
	} else if strings.Contains(questionLower, "last 12 hour") {
		fromTime = toTime.Add(-12 * time.Hour)
		timeDesc = "last 12 hours"
	} else if strings.Contains(questionLower, "last 6 hour") {
		fromTime = toTime.Add(-6 * time.Hour)
		timeDesc = "last 6 hours"
	} else if strings.Contains(questionLower, "today") {
		// Today: 00:00 to now
		fromTime = time.Date(toTime.Year(), toTime.Month(), toTime.Day(), 0, 0, 0, 0, time.UTC)
		timeDesc = "today"
	} else {
		// Default: last 1 hour
		fromTime = toTime.Add(-1 * time.Hour)
		timeDesc = "last 1 hour"
	}

	log.Printf("   Time window: %s (%s to %s)", timeDesc, fromTime.Format("15:04"), toTime.Format("15:04"))

	query := `
		SELECT id, timestamp, service, level, route, message, metadata, created_at
		FROM logs
		WHERE timestamp BETWEEN $1 AND $2
		ORDER BY timestamp DESC
		LIMIT 100
	`
	args := []interface{}{fromTime, toTime}

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

	// Build summary for Gemini
	errorCount := 0
	serviceMap := make(map[string]bool)
	for _, log := range relevantLogs {
		if log.Level == "ERROR" {
			errorCount++
		}
		serviceMap[log.Service] = true
	}

	// Convert service map to slice
	var services []string
	for s := range serviceMap {
		services = append(services, s)
	}

	prompt := fmt.Sprintf(`You are LogFlow, an expert SRE assistant.

**Context:** Logs from %s (%d total, %d errors)

**Logs (newest first):**
%s

**User Question:** %s

**Output Format (IMPORTANT - Use plain text, NO markdown):**

ISSUE:
[one-line summary]

ROOT CAUSE:
[specific issue with details]

AFFECTED SERVICES:
[comma-separated list]

TIME STARTED:
[timestamp]

ACTION REQUIRED:
[numbered steps]

Use plain text only. No ** or markdown. Add line breaks between sections.`, timeDesc, len(relevantLogs), errorCount, context, req.Question)

	answer, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("❌ Gemini API error: %v", err)
		http.Error(w, "Failed to query AI", http.StatusInternalServerError)
		return
	}

	response := AIQueryResponse{
		Answer:       fmt.Sprintf("Analyzed: %s\n\n%s\n\nSUMMARY: %d logs | %d errors | %d services", timeDesc, answer, len(relevantLogs), errorCount, len(services)),
		RelevantLogs: relevantLogs,
		LogCount:     len(relevantLogs),
		ErrorCount:   errorCount,
		TimeRange:    timeDesc,
		Services:     services,
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

// Advanced metrics handler - extract structured data from log messages
func advancedMetricsHandler(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT message, level, service FROM logs 
		WHERE message IS NOT NULL 
		ORDER BY created_at DESC LIMIT 10000
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, "Error querying logs", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	userIDs := make(map[string]int)
	orderIDs := make(map[string]int)
	productIDs := make(map[string]int)
	errorReasons := make(map[string]int)
	responseTimes := []int{}
	attemptCounts := []int{}
	stockLevels := []int{}

	for rows.Next() {
		var message, level, service string
		rows.Scan(&message, &level, &service)

		// Extract user_id
		userRe := regexp.MustCompile(`user_id=([a-zA-Z0-9_-]+)`)
		if matches := userRe.FindStringSubmatch(message); len(matches) > 1 {
			userIDs[matches[1]]++
		}

		// Extract order_id
		orderRe := regexp.MustCompile(`order_id=([A-Z0-9-]+)`)
		if matches := orderRe.FindStringSubmatch(message); len(matches) > 1 {
			orderIDs[matches[1]]++
		}

		// Extract product_id
		productRe := regexp.MustCompile(`product_id=([A-Z0-9-]+)`)
		if matches := productRe.FindStringSubmatch(message); len(matches) > 1 {
			productIDs[matches[1]]++
		}

		// Extract error reasons
		reasonRe := regexp.MustCompile(`reason=([a-zA-Z_]+)`)
		if matches := reasonRe.FindStringSubmatch(message); len(matches) > 1 {
			errorReasons[matches[1]]++
		}

		// Extract response times (duration or timeout)
		durationRe := regexp.MustCompile(`duration=(\d+)ms`)
		if matches := durationRe.FindStringSubmatch(message); len(matches) > 1 {
			if val, err := strconv.Atoi(matches[1]); err == nil {
				responseTimes = append(responseTimes, val)
			}
		}

		timeoutRe := regexp.MustCompile(`timeout=(\d+)ms`)
		if matches := timeoutRe.FindStringSubmatch(message); len(matches) > 1 {
			if val, err := strconv.Atoi(matches[1]); err == nil {
				responseTimes = append(responseTimes, val)
			}
		}

		// Extract attempt counts
		attemptsRe := regexp.MustCompile(`attempts=(\d+)`)
		if matches := attemptsRe.FindStringSubmatch(message); len(matches) > 1 {
			if val, err := strconv.Atoi(matches[1]); err == nil {
				attemptCounts = append(attemptCounts, val)
			}
		}

		// Extract stock levels
		stockRe := regexp.MustCompile(`current_stock=(\d+)`)
		if matches := stockRe.FindStringSubmatch(message); len(matches) > 1 {
			if val, err := strconv.Atoi(matches[1]); err == nil {
				stockLevels = append(stockLevels, val)
			}
		}
	}

	// Calculate averages
	avgResponseTime := 0
	if len(responseTimes) > 0 {
		sum := 0
		for _, t := range responseTimes {
			sum += t
		}
		avgResponseTime = sum / len(responseTimes)
	}

	avgAttempts := 0
	if len(attemptCounts) > 0 {
		sum := 0
		for _, a := range attemptCounts {
			sum += a
		}
		avgAttempts = sum / len(attemptCounts)
	}

	avgStock := 0
	if len(stockLevels) > 0 {
		sum := 0
		for _, s := range stockLevels {
			sum += s
		}
		avgStock = sum / len(stockLevels)
	}

	// Convert maps to slices for JSON (top 10 each)
	topUsers := getTopN(userIDs, 10)
	topOrders := getTopN(orderIDs, 10)
	topProducts := getTopN(productIDs, 10)
	topReasons := getTopN(errorReasons, 10)

	response := map[string]interface{}{
		"top_users":          topUsers,
		"top_orders":         topOrders,
		"top_products":       topProducts,
		"top_error_reasons":  topReasons,
		"avg_response_time":  avgResponseTime,
		"total_timeouts":     len(responseTimes),
		"avg_retry_attempts": avgAttempts,
		"avg_stock_level":    avgStock,
		"timestamp":          time.Now().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper to get top N items from map
func getTopN(m map[string]int, n int) []map[string]interface{} {
	type kv struct {
		Key   string
		Value int
	}
	var kvs []kv
	for k, v := range m {
		kvs = append(kvs, kv{k, v})
	}
	sort.Slice(kvs, func(i, j int) bool {
		return kvs[i].Value > kvs[j].Value
	})

	result := []map[string]interface{}{}
	for i := 0; i < n && i < len(kvs); i++ {
		result = append(result, map[string]interface{}{
			"name":  kvs[i].Key,
			"count": kvs[i].Value,
		})
	}
	return result
}
