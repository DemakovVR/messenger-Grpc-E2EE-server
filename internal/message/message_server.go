package message

import (
	"context"
	"time"

	messagepb "Server/gen/message"
	"Server/internal/contextkeys"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type MessageServer struct {
	messagepb.UnimplementedMessageServiceServer
	messageService *MessageService
}

func NewMessageServer(messageService *MessageService) *MessageServer {
	return &MessageServer{messageService: messageService}
}

func (s *MessageServer) SendMessage(
	ctx context.Context,
	req *messagepb.SendMessageRequest,
) (*messagepb.SendMessageResponse, error) {

	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	var replyToID *uuid.UUID
	var replyToProto *messagepb.MessageResponse
	if req.ReplyToMessageId != "" {
		if parsed, err := uuid.Parse(req.ReplyToMessageId); err == nil {
			replyToID = &parsed
			if parent, err := s.messageService.GetMessageByID(ctx, *replyToID); err == nil {
				replyToProto = &messagepb.MessageResponse{
					Id:               parent.ID.String(),
					ChatId:           parent.ChatID.String(),
					SenderId:         parent.SenderID.String(),
					EncryptedContent: parent.EncryptedContent,
					IsEncrypted:      parent.IsEncrypted,
					SentAt:           parent.SentAt.Format(time.RFC3339),
				}
			}
		}
	}

	messageID, err := s.messageService.SendMessage(
		ctx,
		chatID,
		userID,
		req.EncryptedContent,
		req.IsEncrypted,
		replyToID,
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
				replyToProto,
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

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)
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
		var replyToProto *messagepb.MessageResponse

		if msg.ReplyToID != nil {
			parentContent := ""
			if msg.ParentContent != nil {
				parentContent = *msg.ParentContent
			}
			parentSenderID := ""
			if msg.ParentSenderID != nil {
				parentSenderID = msg.ParentSenderID.String()
			}
			parentIsEncrypted := false
			if msg.ParentIsEncrypted != nil {
				parentIsEncrypted = *msg.ParentIsEncrypted
			}

			replyToProto = &messagepb.MessageResponse{
				Id:               msg.ReplyToID.String(),
				ChatId:           msg.ChatID.String(),
				SenderId:         parentSenderID,
				EncryptedContent: parentContent,
				IsEncrypted:      parentIsEncrypted,
			}
		}

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
			ReplyTo:          replyToProto,
		})
	}

	return &messagepb.GetMessagesResponse{
		Messages: result,
	}, nil
}

func (s *MessageServer) ConnectMessages(req *messagepb.ConnectRequest, stream messagepb.MessageService_ConnectMessagesServer) error {
	val := stream.Context().Value(contextkeys.UserIDKey)
	if val == nil {
		return status.Errorf(codes.Unauthenticated, "user ID missing in context")
	}
	userIDStr := val.(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "invalid user ID format")
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

func (s *MessageServer) DeleteMessage(ctx context.Context, req *messagepb.DeleteMessageRequest) (*messagepb.Empty, error) {
	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)
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
		for _, pID := range participants {
			if pID == userID {
				continue
			}
			s.messageService.PublishDeletion(pID, messageID.String(), chatID.String(), userID.String())
		}
	}
	return &messagepb.Empty{}, nil
}

func (s *MessageServer) EditMessage(ctx context.Context, req *messagepb.EditMessageRequest) (*messagepb.Empty, error) {
	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}
	messageID, err := uuid.Parse(req.MessageId)
	if err != nil {
		return nil, err
	}

	chatID, err := s.messageService.EditMessage(ctx, messageID, userID, req.EncryptedContent, req.IsEncrypted)
	if err != nil {
		return nil, err
	}

	participants, err := s.messageService.GetChatParticipants(ctx, chatID)
	if err == nil {
		for _, pID := range participants {
			if pID == userID {
				continue
			}
			s.messageService.PublishEdit(pID, messageID.String(), chatID.String(), userID.String(), req.EncryptedContent, req.IsEncrypted)
		}
	}
	return &messagepb.Empty{}, nil
}
