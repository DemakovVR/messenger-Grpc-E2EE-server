package grpc

import (
	"context"

	chatpb "Server/gen/chat"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
)

type ChatServer struct {
	chatpb.UnimplementedChatServiceServer

	chatService *service.ChatService
}

func NewChatServer(
	chatService *service.ChatService,
) *ChatServer {
	return &ChatServer{
		chatService: chatService,
	}
}

func (s *ChatServer) CreatePrivateChat(
	ctx context.Context,
	req *chatpb.CreatePrivateChatRequest,
) (*chatpb.CreateChatResponse, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	otherUserID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, err
	}

	chatID, err := s.chatService.CreatePrivateChat(
		ctx,
		userID,
		otherUserID,
	)
	if err != nil {
		return nil, err
	}

	return &chatpb.CreateChatResponse{
		ChatId: chatID.String(),
	}, nil
}

func (s *ChatServer) CreateGroupChat(
	ctx context.Context,
	req *chatpb.CreateGroupChatRequest,
) (*chatpb.CreateChatResponse, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	participants := make([]uuid.UUID, 0, len(req.ParticipantIds)+1)

	for _, id := range req.ParticipantIds {
		uid, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		participants = append(participants, uid)
	}

	participants = append(participants, userID)

	chatID, err := s.chatService.CreateGroupChat(
		ctx,
		req.Name,
		participants,
	)
	if err != nil {
		return nil, err
	}

	return &chatpb.CreateChatResponse{
		ChatId: chatID.String(),
	}, nil
}

func (s *ChatServer) GetChats(
	ctx context.Context,
	req *chatpb.GetChatsRequest,
) (*chatpb.GetChatsResponse, error) {

	userIDStr := ctx.Value(middleware.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	chats, err := s.chatService.GetChats(
		ctx,
		userID,
	)
	if err != nil {
		return nil, err
	}

	var result []*chatpb.Chat

	for _, chat := range chats {
		result = append(result, &chatpb.Chat{
			Id:   chat.ID.String(),
			Type: chat.Type,
			Name: chat.Name,
		})
	}

	return &chatpb.GetChatsResponse{
		Chats: result,
	}, nil
}
