package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

type LogEvent struct {
	Timestamp string `json:"timestamp"`
	Service   string
	Level     string
	Message   string
	Route     string
}

func main() {
	// ✅ Read server URL from environment
	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://localhost:8080"
	}

	fmt.Printf("🚀 Log Agent starting...\n")
	fmt.Printf("📡 Target Server: %s\n", serverURL)

	services := []string{"payment-service", "auth-service", "api-gateway", "database"}

	// Infinite Burst cycles: HEALTHY → CRASH → HEALTHY (perfect Time-Travel demo)
	for cycle := 1; ; cycle++ {
		fmt.Printf("\n🔄 CYCLE %d: HEALTHY PHASE (20 logs, mixed)...\n", cycle)

		// HEALTHY: Mix of INFO and WARNING logs (2min window)
		for i := 0; i < 20; i++ {
			level := "INFO"
			// Generate rich metadata for metrics extraction
			userID := fmt.Sprintf("user_%d", (i%10)+1)
			productID := fmt.Sprintf("PROD-%03d", (i%5)+1)
			duration := 45 + (i * 2)

			message := fmt.Sprintf("Order processed successfully user_id=%s product_id=%s duration=%dms current_stock=%d",
				userID, productID, duration, 100-i)

			// Add a log with PII to verify the scrubber
			if i == 1 {
				message = fmt.Sprintf("User login attempt from ip=192.168.1.%d user_id=%s email=user_%s@example.com", i+10, userID, userID)
			}

			if i%5 == 0 {
				level = "WARNING"
				message = fmt.Sprintf("Slow request detected user_id=%s duration=%dms attempts=%d",
					userID, duration+200, (i%3)+1)
			}

			log := LogEvent{
				Timestamp: time.Now().UTC().Format(time.RFC3339),
				Service:   services[i%4],
				Level:     level,
				Message:   message,
				Route:     "/api/users/login",
			}
			sendLog(serverURL, log)
			time.Sleep(3 * time.Second) // Realistic rate
		}

		fmt.Printf("\n💥 CYCLE %d: CRASH PHASE (100 ERRORs, flood)...\n", cycle)

		// CRASH: ERROR flood (30s window)
		for i := 0; i < 100; i++ {
			log := LogEvent{
				Timestamp: time.Now().UTC().Format(time.RFC3339), // FRESH timestamps!
				Service:   services[i%4],
				Level:     "ERROR",
				Message:   fmt.Sprintf("Transaction failed order_id=ORD-%d reason=TIMEOUT timeout=5000ms attempts=3", i+5000),
				Route:     "/api/payments/process",
			}
			sendLog(serverURL, log)
			time.Sleep(200 * time.Millisecond) // FLOOD!
		}

		fmt.Printf("\n✅ CYCLE %d COMPLETE - Time-Travel ready! (Check UI: healthy=just now, crash=2min ago)\n\n", cycle)
		time.Sleep(10 * time.Second)
	}
}

func sendLog(url string, log LogEvent) {
	data, _ := json.Marshal(log)
	resp, err := http.Post(url+"/ingest", "application/json", bytes.NewReader(data))
	if err == nil && resp.StatusCode == 201 {
		fmt.Printf("✅ %s %s %s\n", log.Timestamp[:19], log.Service, log.Level)
	} else {
		status := "ERROR"
		if resp != nil {
			status = resp.Status
		}
		fmt.Printf("❌ FAILED to send log: %v (Status: %s)\n", err, status)
	}
}
