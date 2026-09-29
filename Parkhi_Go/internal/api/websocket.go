package api

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"yukti/backend/pkg/logger"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for CORS
	},
}

type WSMessage struct {
	Action    string  `json:"action,omitempty"`
	JobID     string  `json:"jobId,omitempty"`
	Status    string  `json:"status,omitempty"` // DOWNLOADING_S2, STREAMING_GRPC, PROCESSING_MODEL, COMPLETE, FAILED
	Progress  float64 `json:"progress,omitempty"`
	Message   string  `json:"message,omitempty"`
	LayerURL  string  `json:"layer_url,omitempty"`
	Timestamp int64   `json:"timestamp,omitempty"`
}

type WSClient struct {
	hub          *WSHub
	conn         *websocket.Conn
	send         chan []byte
	subscribedID string
}

type WSHub struct {
	clients    map[*WSClient]bool
	broadcast  chan WSMessage
	register   chan *WSClient
	unregister chan *WSClient
	mu         sync.RWMutex
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients:    make(map[*WSClient]bool),
		broadcast:  make(chan WSMessage, 100),
		register:   make(chan *WSClient),
		unregister: make(chan *WSClient),
	}
}

func (h *WSHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			logger.Info("WebSocket client connected (total active: %d)", len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
			logger.Info("WebSocket client disconnected (total active: %d)", len(h.clients))

		case msg := <-h.broadcast:
			msg.Timestamp = time.Now().UnixMilli()
			data, err := json.Marshal(msg)
			if err != nil {
				continue
			}

			h.mu.RLock()
			for client := range h.clients {
				// Send if client subscribed to all or to this specific jobId
				if client.subscribedID == "" || client.subscribedID == msg.JobID {
					select {
					case client.send <- data:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *WSHub) BroadcastStatus(jobID, status string, progress float64, message, layerURL string) {
	h.broadcast <- WSMessage{
		JobID:    jobID,
		Status:   status,
		Progress: progress,
		Message:  message,
		LayerURL: layerURL,
	}
}

func (h *WSHub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("Failed to upgrade HTTP connection to WebSocket: %v", err)
		return
	}

	jobID := r.URL.Query().Get("jobId")

	client := &WSClient{
		hub:          h,
		conn:         conn,
		send:         make(chan []byte, 256),
		subscribedID: jobID,
	}

	h.register <- client

	// Start pump goroutines
	go client.writePump()
	go client.readPump()
}

func (c *WSClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var incoming WSMessage
		if err := json.Unmarshal(message, &incoming); err == nil {
			if incoming.Action == "subscribe" && incoming.JobID != "" {
				c.subscribedID = incoming.JobID
				logger.Info("WebSocket client subscribed to Job ID: %s", incoming.JobID)
			}
		}
	}
}

func (c *WSClient) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
