package redis

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"yukti/backend/pkg/logger"
)

type RedisService struct {
	client       *redis.Client
	useFallback  bool
	memTokens    map[string]cachedToken
	memRateLimit map[string]*tokenBucket
	mu           sync.Mutex
}

type cachedToken struct {
	value     string
	expiresAt time.Time
}

type tokenBucket struct {
	tokens     float64
	lastRefill time.Time
}

func NewRedisService(redisURL string) *RedisService {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		logger.Warn("Failed to parse Redis URL (%s): %v, falling back to in-memory cache", redisURL, err)
		return &RedisService{
			useFallback:  true,
			memTokens:    make(map[string]cachedToken),
			memRateLimit: make(map[string]*tokenBucket),
		}
	}

	rdb := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("Redis ping failed (%v). Operating with in-memory fallback for rate limiting & token caching.", err)
		return &RedisService{
			client:       rdb,
			useFallback:  true,
			memTokens:    make(map[string]cachedToken),
			memRateLimit: make(map[string]*tokenBucket),
		}
	}

	logger.Info("Connected to Redis successfully")
	return &RedisService{
		client:       rdb,
		useFallback:  false,
		memTokens:    make(map[string]cachedToken),
		memRateLimit: make(map[string]*tokenBucket),
	}
}

// AllowRequest implements token bucket rate limiting (capacity: 20 tokens, refill: 1 token/sec)
func (r *RedisService) AllowRequest(clientIP string, capacity float64, refillRate float64) bool {
	if r.useFallback || r.client == nil {
		r.mu.Lock()
		defer r.mu.Unlock()

		tb, exists := r.memRateLimit[clientIP]
		now := time.Now()
		if !exists {
			r.memRateLimit[clientIP] = &tokenBucket{
				tokens:     capacity - 1,
				lastRefill: now,
			}
			return true
		}

		elapsed := now.Sub(tb.lastRefill).Seconds()
		tb.tokens = tb.tokens + (elapsed * refillRate)
		if tb.tokens > capacity {
			tb.tokens = capacity
		}
		tb.lastRefill = now

		if tb.tokens >= 1.0 {
			tb.tokens -= 1.0
			return true
		}
		return false
	}

	// Redis atomic token bucket script
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	key := fmt.Sprintf("rate_limit:%s", clientIP)

	// Simple sliding window counter in Redis
	count, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return true // Fail open on Redis error
	}
	if count == 1 {
		r.client.Expire(ctx, key, 60*time.Second)
	}

	// Max 30 requests per minute
	return count <= 30
}

// GetCachedToken retrieves an OAuth2 token by key
func (r *RedisService) GetCachedToken(key string) (string, bool) {
	if r.useFallback || r.client == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		item, exists := r.memTokens[key]
		if !exists || time.Now().After(item.expiresAt) {
			delete(r.memTokens, key)
			return "", false
		}
		return item.value, true
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return "", false
	}
	return val, true
}

// SetCachedToken saves an OAuth2 token with TTL
func (r *RedisService) SetCachedToken(key string, token string, ttl time.Duration) error {
	if r.useFallback || r.client == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.memTokens[key] = cachedToken{
			value:     token,
			expiresAt: time.Now().Add(ttl),
		}
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	return r.client.Set(ctx, key, token, ttl).Err()
}
