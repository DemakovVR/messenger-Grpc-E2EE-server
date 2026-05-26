package service

import (
	"sync"
	"time"
)

type ClientLimiter struct {
	Count int
	Reset time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*ClientLimiter
}

func NewRateLimiter() *RateLimiter {

	return &RateLimiter{
		clients: make(
			map[string]*ClientLimiter,
		),
	}
}

func (r *RateLimiter) Allow(
	userID string,
) bool {

	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()

	client, ok := r.clients[userID]

	if !ok {

		r.clients[userID] = &ClientLimiter{
			Count: 1,
			Reset: now.Add(time.Minute),
		}

		return true
	}

	if now.After(client.Reset) {

		client.Count = 0
		client.Reset = now.Add(time.Minute)
	}

	client.Count++

	return client.Count <= 100
}
