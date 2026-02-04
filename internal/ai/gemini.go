package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type Client struct {
	APIKey string
	Model  string
}

type GeminiRequest struct {
	Contents []Content `json:"contents"`
}

type Content struct {
	Parts []Part `json:"parts"`
}

type Part struct {
	Text       string      `json:"text,omitempty"`
	InlineData *InlineData `json:"inlineData,omitempty"`
}

type InlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type GeminiResponse struct {
	Candidates []Candidate `json:"candidates"`
}

type Candidate struct {
	Content Content `json:"content"`
}

func NewClient(apiKey string) *Client {
	return &Client{
		APIKey: apiKey,
		Model:  "gemini-3-flash-preview",
	}
}

func (c *Client) Query(prompt string, imageData string, mimeType string) (string, error) {
	encodedKey := url.QueryEscape(c.APIKey)
	baseURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", c.Model)
	fullURL := fmt.Sprintf("%s?key=%s", baseURL, encodedKey)

	parts := []Part{
		{Text: prompt},
	}

	if imageData != "" && mimeType != "" {
		parts = append(parts, Part{
			InlineData: &InlineData{
				MimeType: mimeType,
				Data:     imageData,
			},
		})
	}

	reqBody := GeminiRequest{
		Contents: []Content{
			{
				Parts: parts,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(fullURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error (%d): %s", resp.StatusCode, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response from Gemini")
	}

	return geminiResp.Candidates[0].Content.Parts[0].Text, nil
}
