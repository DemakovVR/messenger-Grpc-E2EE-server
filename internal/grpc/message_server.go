package grpc

import (
	"context"

	messagepb "Server/gen/message"
	"Server/internal/middleware"
	"Server/internal/service"
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

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	messageID, err := s.messageService.SendMessage(
		ctx,
		req.ChatId,
		userID,
		req.Content,
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

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	messages, err := s.messageService.GetMessages(
		ctx,
		req.ChatId,
		userID,
	)

	if err != nil {
		return nil, err
	}

	var result []*messagepb.Message

	for _, msg := range messages {

		result = append(
			result,
			&messagepb.Message{
				Id:       msg.ID.String(),
				ChatId:   msg.ChatID.String(),
				SenderId: msg.SenderID.String(),
				Content:  msg.Content,
				SentAt:   msg.SentAt.Format("2006-01-02 15:04:05"),
			},
		)
	}

	return &messagepb.GetMessagesResponse{
		Messages: result,
	}, nil
}
