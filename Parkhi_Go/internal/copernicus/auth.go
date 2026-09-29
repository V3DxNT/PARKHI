package copernicus

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"yukti/backend/internal/config"
	"yukti/backend/internal/redis"
	"yukti/backend/pkg/logger"
)

const (
	CDSETokenURL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
	TokenCacheKey = "cdse_oauth_token"
)

type CDSEAuthService struct {
	cfg   *config.Config
	redis *redis.RedisService
}

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	TokenType   string `json:"token_type"`
}

func NewCDSEAuthService(cfg *config.Config, rds *redis.RedisService) *CDSEAuthService {
	return &CDSEAuthService{
		cfg:   cfg,
		redis: rds,
	}
}

// GetAccessToken returns a valid Copernicus OAuth2 access token, fetching from cache or CDSE auth server
func (a *CDSEAuthService) GetAccessToken() (string, error) {
	// 1. Check Redis cache
	if token, ok := a.redis.GetCachedToken(TokenCacheKey); ok && token != "" {
		return token, nil
	}

	username := strings.Trim(strings.TrimSpace(a.cfg.CDSEUsername), "\"")
	password := strings.Trim(strings.TrimSpace(a.cfg.CDSEPassword), "\"")
	clientID := strings.Trim(strings.TrimSpace(a.cfg.CDSEClientID), "\"")
	if clientID == "" {
		clientID = "cdse-public"
	}

	if username == "" || password == "" {
		logger.Warn("CDSE credentials not configured in environment; operating in mock satellite acquisition mode")
		return "mock_cdse_access_token", nil
	}

	// 2. Request new token from CDSE OpenID Connect endpoint
	formData := url.Values{
		"grant_type": {"password"},
		"client_id":  {clientID},
		"username":   {username},
		"password":   {password},
	}

	req, err := http.NewRequest(http.MethodPost, CDSETokenURL, strings.NewReader(formData.Encode()))
	if err != nil {
		return "", fmt.Errorf("failed to build CDSE token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("CDSE token endpoint request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("CDSE auth failed (status %d): %s", resp.StatusCode, string(body))
	}

	var tokenResp tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode CDSE token response: %w", err)
	}

	if tokenResp.AccessToken == "" {
		return "", errors.New("empty access token received from CDSE")
	}

	// 3. Cache token in Redis with a safety margin (subtract 60 seconds from TTL)
	ttl := time.Duration(tokenResp.ExpiresIn-60) * time.Second
	if ttl <= 0 {
		ttl = 300 * time.Second
	}
	_ = a.redis.SetCachedToken(TokenCacheKey, tokenResp.AccessToken, ttl)

	logger.Info("Acquired fresh CDSE OAuth2 token (expires in %d sec)", tokenResp.ExpiresIn)
	return tokenResp.AccessToken, nil
}
