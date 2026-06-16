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
	rl := &RateLimiter{
		clients: make(map[string]*ClientLimiter),
	}

	go rl.startCleanupWorker(10 * time.Minute)

	return rl
}

func (r *RateLimiter) Allow(userID string) bool {
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

	return client.Count <= 50000
}

func (r *RateLimiter) startCleanupWorker(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		r.mu.Lock()
		now := time.Now()
		for userID, client := range r.clients {
			if now.After(client.Reset.Add(5 * time.Minute)) {
				delete(r.clients, userID)
			}
		}
		r.mu.Unlock()
	}
}
