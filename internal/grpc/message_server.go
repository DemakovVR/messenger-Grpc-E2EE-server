package grpc

import (
	"context"

	messagepb "Server/gen/message"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
)

type MessageServer struct {
	messagepb.UnimplementedMessageServiceServer

	messageService *service.MessageService
}

func NewMessageServer(
	messageService *service.MessageService,
) *MessageServer {
	return &MessageServer{
		messageService: messageService,
	}
}

func (s *MessageServer) SendMessage(
	ctx context.Context,
	req *messagepb.SendMessageRequest,
) (*messagepb.SendMessageResponse, error) {

	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	messageID, err := s.messageService.SendMessage(
		ctx,
		chatID,
		userID,
		req.EncryptedContent,
	)

	if err != nil {
		return nil, err
	}

	return &messagepb.SendMessageResponse{
		MessageId: messageID.String(),
	}, nil
}

func (s *MessageServer) GetMessages(
	ctx context.Context,
	req *messagepb.GetMessagesRequest,
) (*messagepb.GetMessagesResponse, error) {

	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	messages, err := s.messageService.GetMessages(
		ctx,
		chatID,
		userID,
	)

	if err != nil {
		return nil, err
	}

	var result []*messagepb.MessageResponse

	for _, msg := range messages {
		result = append(result, &messagepb.MessageResponse{
			Id:               msg.ID.String(),
			ChatId:           msg.ChatID.String(),
			SenderId:         msg.SenderID.String(),
			EncryptedContent: msg.EncryptedContent,
			SentAt:           msg.SentAt.Format("2006-01-02 15:04:05"),
		})
	}

	return &messagepb.GetMessagesResponse{
		Messages: result,
	}, nil
}

func (s *MessageServer) ConnectMessages(
	req *messagepb.ConnectRequest,
	stream messagepb.MessageService_ConnectMessagesServer,
) error {

	userIDStr := stream.Context().Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return err
	}

	ch := s.messageService.Subscribe(userID)
	defer s.messageService.Unsubscribe(userID, ch)

	for {
		select {

		case <-stream.Context().Done():
			return nil

		case msg := <-ch:
			if err := stream.Send(msg); err != nil {
				return err
			}
		}
	}
}
