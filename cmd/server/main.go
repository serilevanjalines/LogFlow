package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/serilevanjalines/LogFlow/internal/ai"
)

type LogEvent struct {
	Service   string
	Level     string
	Message   string
	Timestamp string
	Route     string
}

var (
	events       []LogEvent
	mu           sync.Mutex
	geminiClient *ai.Client
)

func main() {

	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	//gett yourr geminii clienttt --->
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY not set in environment")
	}
	geminiClient = ai.NewClient(apiKey)
	log.Println("Gemini AI client initialized")

	http.HandleFunc("/ingest", ingestHandler)
	http.HandleFunc("/logs", logsHandler)
	http.HandleFunc("/ai/query", aiQueryHandler)
	http.HandleFunc("/ai/summary", aiSummaryHandler)

	log.Println("LogFlow server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
func ingestHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	body, _ := io.ReadAll(r.Body)

	var evt LogEvent
	if err := json.Unmarshal(body, &evt); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	evt.Timestamp = time.Now().UTC().Format(time.RFC3339)

	mu.Lock()
	events = append(events, evt)
	mu.Unlock()

	fmt.Println("STORED:", evt)
	w.WriteHeader(http.StatusOK)
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	levelFilter := r.URL.Query().Get("level")
	serviceFilter := r.URL.Query().Get("service")
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	routeFilter := r.URL.Query().Get("route")

	var fromTime, toTime time.Time
	var haveFrom, haveTo bool

	if fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			fromTime = t
			haveFrom = true
		}
	}
	if toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			toTime = t
			haveTo = true
		}
	}

	mu.Lock()
	defer mu.Unlock()

	var out []LogEvent
	for _, evt := range events {
		if serviceFilter != "" && evt.Service != serviceFilter {
			continue
		}
		if levelFilter != "" && evt.Level != levelFilter {
			continue
		}

		evtTime, err := time.Parse(time.RFC3339, evt.Timestamp)
		if err != nil {
			continue
		}

		if haveFrom && evtTime.Before(fromTime) {
			continue
		}
		if haveTo && evtTime.After(toTime) {
			continue
		}
		if routeFilter != "" && evt.Route != routeFilter {
			continue
		}

		out = append(out, evt)
	}

	json.NewEncoder(w).Encode(out)
}

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

type AISummaryResponse struct {
	Summary      string         `json:"summary"`
	TotalLogs    int            `json:"total_logs"`
	ErrorCount   int            `json:"error_count"`
	WarningCount int            `json:"warning_count"`
	InfoCount    int            `json:"info_count"`
	TopServices  map[string]int `json:"top_services"`
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

	mu.Lock()
	var relevantLogs []LogEvent
	for _, evt := range events {
		if req.Service != "" && evt.Service != req.Service {
			continue
		}
		if req.Level != "" && evt.Level != req.Level {
			continue
		}
		relevantLogs = append(relevantLogs, evt)
	}
	mu.Unlock()

	context := fmt.Sprintf("Total logs: %d\n\n", len(relevantLogs))

	maxLogs := 20
	if len(relevantLogs) > maxLogs {
		context += fmt.Sprintf("Showing most recent %d logs:\n", maxLogs)
		relevantLogs = relevantLogs[len(relevantLogs)-maxLogs:]
	}

	for i, log := range relevantLogs {
		context += fmt.Sprintf("%d. [%s] Service: %s, Level: %s, Message: %s, Route: %s\n",
			i+1, log.Timestamp, log.Service, log.Level, log.Message, log.Route)
	}

	prompt := fmt.Sprintf(`You are an expert SRE assistant analyzing application logs.

Context (Recent Logs):
%s

User Question: %s

Please provide a concise answer based on the logs above. If you notice patterns, errors, or issues, mention them. If the logs don't contain relevant information, say so.`, context, req.Question)

	answer, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("Gemini API error: %v", err)
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

	log.Printf("AI Query answered: %s (found %d logs)", req.Question, len(relevantLogs))
}

func aiSummaryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	serviceFilter := r.URL.Query().Get("service")
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")

	var fromTime, toTime time.Time
	var haveFrom, haveTo bool

	if fromStr != "" {
		if t, err := time.Parse(time.RFC3339, fromStr); err == nil {
			fromTime = t
			haveFrom = true
		}
	}
	if toStr != "" {
		if t, err := time.Parse(time.RFC3339, toStr); err == nil {
			toTime = t
			haveTo = true
		}
	}

	mu.Lock()
	var filteredLogs []LogEvent
	errorCount := 0
	warningCount := 0
	infoCount := 0
	serviceMap := make(map[string]int)

	for _, evt := range events {
		if serviceFilter != "" && evt.Service != serviceFilter {
			continue
		}

		if evt.Timestamp != "" {
			evtTime, err := time.Parse(time.RFC3339, evt.Timestamp)
			if err == nil {
				if haveFrom && evtTime.Before(fromTime) {
					continue
				}
				if haveTo && evtTime.After(toTime) {
					continue
				}
			}
		}

		filteredLogs = append(filteredLogs, evt)

		switch evt.Level {
		case "ERROR":
			errorCount++
		case "WARN", "WARNING":
			warningCount++
		case "INFO":
			infoCount++
		}

		serviceMap[evt.Service]++
	}
	mu.Unlock()

	if len(filteredLogs) == 0 {
		http.Error(w, "No logs found for the given filters", http.StatusNotFound)
		return
	}

	context := fmt.Sprintf(`Log Statistics:
- Total logs: %d
- Errors: %d
- Warnings: %d
- Info: %d

Top Services:`, len(filteredLogs), errorCount, warningCount, infoCount)

	for service, count := range serviceMap {
		context += fmt.Sprintf("\n- %s: %d logs", service, count)
	}

	if errorCount > 0 {
		context += "\n\nSample Error Messages:"
		errorSamples := 0
		for _, evt := range filteredLogs {
			if evt.Level == "ERROR" && errorSamples < 5 {
				context += fmt.Sprintf("\n- [%s] %s: %s", evt.Timestamp, evt.Service, evt.Message)
				errorSamples++
			}
		}
	}

	prompt := fmt.Sprintf(`You are an expert SRE assistant. Analyze the following log statistics and provide:
1. A brief incident summary (2-3 sentences)
2. The most likely root cause
3. Three specific actions to investigate or resolve the issue

%s

Provide a concise, actionable summary.`, context)

	summary, err := geminiClient.Query(prompt)
	if err != nil {
		log.Printf("Gemini API error: %v", err)
		http.Error(w, "Failed to generate summary", http.StatusInternalServerError)
		return
	}

	response := AISummaryResponse{
		Summary:      summary,
		TotalLogs:    len(filteredLogs),
		ErrorCount:   errorCount,
		WarningCount: warningCount,
		InfoCount:    infoCount,
		TopServices:  serviceMap,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("AI Summary generated for %d logs", len(filteredLogs))
}
