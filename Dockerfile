FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git 

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Stage 2: Runtime (alpine:latest)
FROM alpine:latest

# Install CA certs for Gemini API calls and curl for healthchecks
RUN apk add --no-cache ca-certificates curl && \
    update-ca-certificates

WORKDIR /app

# Create a non-root user for security
RUN adduser -D logflow
COPY --from=builder /app/server .
RUN chown -R logflow:logflow /app

USER logflow

EXPOSE 8080

CMD ["./server"]