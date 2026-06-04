package grpc

import (
	"context"
	"log"

	messagepb "Server/gen/message"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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
		req.IsEncrypted,
	)

	if err != nil {
		return nil, err
	}

	participants, err := s.messageService.GetChatParticipants(ctx, chatID)
	if err == nil {
		for _, participantID := range participants {
			if participantID == userID {
				continue
			}
			s.messageService.PublishMessage(
				participantID,
				messageID.String(),
				chatID.String(),
				userID.String(),
				req.EncryptedContent,
				req.IsEncrypted,
			)
		}
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

	messages, err := s.messageService.GetMessages(ctx, chatID, userID)
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
			IsEncrypted:      msg.IsEncrypted,
			IsEdited:         msg.IsEdited,
			IsDeleted:        msg.IsDeleted,
			SentAt:           msg.SentAt.Format("2006-01-02 15:04:05"),
			CreatedAt:        msg.CreatedAt.Format("2006-01-02 15:04:05"),
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
	log.Printf("ConnectMessages called")

	val := stream.Context().Value(middleware.UserIDKey)
	if val == nil {
		log.Printf("UserID not found in context (nil)")
		return status.Errorf(codes.Unauthenticated, "user ID missing in context")
	}

	userIDStr, ok := val.(string)
	if !ok {
		log.Printf("UserID in context is not a string, type is %T", val)
		return status.Errorf(codes.Unauthenticated, "invalid user ID format")
	}

	log.Printf("UserID from context: %s", userIDStr)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		log.Printf("Failed to parse userID: %v", err)
		return status.Errorf(codes.InvalidArgument, "invalid user ID format: %v", err)
	}

	ch := s.messageService.Subscribe(userID)
	log.Printf("Subscribed user %s, channel created", userID)

	defer func() {
		s.messageService.Unsubscribe(userID, ch)
		log.Printf("Unsubscribed user %s", userID)
	}()

	for {
		select {
		case <-stream.Context().Done():
			log.Printf("Stream context done for user %s", userID)
			return nil
		case msg := <-ch:
			log.Printf("Sending message to user %s: %+v", userID, msg)
			if err := stream.Send(msg); err != nil {
				return err
			}
		}
	}
}

func (s *MessageServer) DeleteMessage(
	ctx context.Context,
	req *messagepb.DeleteMessageRequest,
) (*messagepb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	messageID, err := uuid.Parse(req.MessageId)
	if err != nil {
		return nil, err
	}

	chatID, err := s.messageService.DeleteMessage(ctx, messageID, userID)
	if err != nil {
		return nil, err
	}

	participants, err := s.messageService.GetChatParticipants(ctx, chatID)
	if err == nil {
		for _, participantID := range participants {
			if participantID == userID {
				continue
			}
			s.messageService.PublishDeletion(
				participantID,
				messageID.String(),
				chatID.String(),
				userID.String(),
			)
		}
	}

	return &messagepb.Empty{}, nil
}

func (s *MessageServer) EditMessage(
	ctx context.Context,
	req *messagepb.EditMessageRequest,
) (*messagepb.Empty, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	messageID, err := uuid.Parse(req.MessageId)
	if err != nil {
		return nil, err
	}

	chatID, err := s.messageService.EditMessage(
		ctx,
		messageID,
		userID,
		req.EncryptedContent,
		req.IsEncrypted,
	)
	if err != nil {
		return nil, err
	}

	participants, err := s.messageService.GetChatParticipants(ctx, chatID)
	if err == nil {
		for _, participantID := range participants {
			if participantID == userID {
				continue
			}
			s.messageService.PublishEdit(
				participantID,
				messageID.String(),
				chatID.String(),
				userID.String(),
				req.EncryptedContent,
				req.IsEncrypted,
			)
		}
	}

	return &messagepb.Empty{}, nil
}
