package service

import (
	messagepb "Server/gen/message"
	"sync"
)

type ConnectionManager struct {
	mu sync.RWMutex

	clients map[string][]chan *messagepb.MessageResponse
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		clients: make(
			map[string][]chan *messagepb.MessageResponse,
		),
	}
}

func (m *ConnectionManager) Subscribe(
	userID string,
) chan *messagepb.MessageResponse {

	m.mu.Lock()
	defer m.mu.Unlock()

	ch := make(chan *messagepb.MessageResponse, 100)

	m.clients[userID] = append(
		m.clients[userID],
		ch,
	)

	return ch
}

func (m *ConnectionManager) Unsubscribe(
	userID string,
	ch chan *messagepb.MessageResponse,
) {

	m.mu.Lock()
	defer m.mu.Unlock()

	list := m.clients[userID]

	for i, c := range list {

		if c == ch {

			m.clients[userID] = append(
				list[:i],
				list[i+1:]...,
			)

			close(c)

			break
		}
	}
}

func (m *ConnectionManager) Publish(
	userID string,
	msg *messagepb.MessageResponse,
) {

	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, ch := range m.clients[userID] {

		select {

		case ch <- msg:

		default:
		}
	}
}
