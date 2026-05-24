package grpc

import (
	"context"

	chatpb "Server/gen/chat"
	"Server/internal/middleware"
	"Server/internal/service"
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

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	chatID, err := s.chatService.CreatePrivateChat(
		ctx,
		userID,
		req.UserId,
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

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	participants := append(
		req.ParticipantIds,
		userID,
	)

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

	userID := ctx.Value(
		middleware.UserIDKey,
	).(string)

	chats, err := s.chatService.GetChats(
		ctx,
		userID,
	)

	if err != nil {
		return nil, err
	}

	var result []*chatpb.Chat

	for _, chat := range chats {

		result = append(
			result,
			&chatpb.Chat{
				Id:   chat.ID.String(),
				Type: chat.Type,
				Name: chat.Name,
			},
		)
	}

	return &chatpb.GetChatsResponse{
		Chats: result,
	}, nil
}
