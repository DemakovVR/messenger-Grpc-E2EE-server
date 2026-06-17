package message

import (
	"log"
	"sync"

	messagepb "Server/gen/message"

	"github.com/google/uuid"
)

type ConnectionManager struct {
	mu sync.RWMutex

	clients map[uuid.UUID][]chan *messagepb.MessageResponse
}

func NewConnectionManager() *ConnectionManager {
	return &ConnectionManager{
		clients: make(map[uuid.UUID][]chan *messagepb.MessageResponse),
	}
}

func (m *ConnectionManager) Subscribe(
	userID uuid.UUID,
) chan *messagepb.MessageResponse {

	log.Println("SUBSCRIBE:", userID)

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
	userID uuid.UUID,
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
	userID uuid.UUID,
	msg *messagepb.MessageResponse,
) {

	m.mu.RLock()
	defer m.mu.RUnlock()

	log.Println(
		"PUBLISH:",
		userID,
		"subscribers:",
		len(m.clients[userID]),
	)

	for _, ch := range m.clients[userID] {

		select {
		case ch <- msg:
		default:
		}
	}
}
