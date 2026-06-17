package chat

import (
	"context"
	"time"

	chatpb "Server/gen/chat"
	"Server/internal/contextkeys"
	"Server/internal/logger"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ChatServer struct {
	chatpb.UnimplementedChatServiceServer
	chatService *ChatService
}

func NewChatServer(chatService *ChatService) *ChatServer {
	return &ChatServer{chatService: chatService}
}

func getUserID(ctx context.Context) (uuid.UUID, error) {
	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)
	return uuid.Parse(userIDStr)
}

func (s *ChatServer) CreatePrivateChat(
	ctx context.Context,
	req *chatpb.CreatePrivateChatRequest,
) (*chatpb.CreateChatResponse, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	otherUserID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, err
	}
	chatID, isExisting, err := s.chatService.CreatePrivateChat(ctx, userID, otherUserID)
	if err != nil {
		return nil, err
	}
	return &chatpb.CreateChatResponse{
		ChatId:     chatID.String(),
		IsExisting: isExisting,
	}, nil
}

func (s *ChatServer) CreateGroupChat(
	ctx context.Context,
	req *chatpb.CreateGroupChatRequest,
) (*chatpb.CreateChatResponse, error) {
	userID, err := getUserID(ctx)
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
	chatID, err := s.chatService.CreateGroupChat(ctx, req.Name, participants, userID)
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
	logger.Log.Info("GetChats called", zap.Any("req", req))
	userID, err := getUserID(ctx)
	if err != nil {
		logger.Log.Error("getUserID failed", zap.Error(err))
		return nil, err
	}
	chats, err := s.chatService.GetChats(ctx, userID)
	if err != nil {
		logger.Log.Error("GetChats service failed", zap.Error(err))
		return nil, err
	}
	result := make([]*chatpb.Chat, 0, len(chats))
	for _, chat := range chats {
		createdBy := ""
		if chat.CreatedBy != uuid.Nil {
			createdBy = chat.CreatedBy.String()
		}
		result = append(result, &chatpb.Chat{
			Id:        chat.ID.String(),
			Type:      chat.Type,
			Name:      chat.Name,
			CreatedBy: createdBy,
		})
	}
	return &chatpb.GetChatsResponse{Chats: result}, nil
}

func (s *ChatServer) DeleteChat(
	ctx context.Context,
	req *chatpb.DeleteChatRequest,
) (*chatpb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}
	err = s.chatService.DeleteChat(ctx, chatID, userID)
	if err != nil {
		return nil, err
	}
	return &chatpb.Empty{}, nil
}

func (s *ChatServer) AddParticipants(
	ctx context.Context,
	req *chatpb.AddParticipantsRequest,
) (*chatpb.Empty, error) {
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}
	participants := make([]uuid.UUID, 0, len(req.UserIds))
	for _, id := range req.UserIds {
		uid, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		participants = append(participants, uid)
	}
	err = s.chatService.AddParticipants(ctx, chatID, participants)
	if err != nil {
		return nil, err
	}
	return &chatpb.Empty{}, nil
}

func (s *ChatServer) RemoveParticipants(
	ctx context.Context,
	req *chatpb.RemoveParticipantsRequest,
) (*chatpb.Empty, error) {
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}
	participants := make([]uuid.UUID, 0, len(req.UserIds))
	for _, id := range req.UserIds {
		uid, err := uuid.Parse(id)
		if err != nil {
			return nil, err
		}
		participants = append(participants, uid)
	}
	err = s.chatService.RemoveParticipants(ctx, chatID, participants)
	if err != nil {
		return nil, err
	}
	return &chatpb.Empty{}, nil
}

func (s *ChatServer) LeaveGroup(
	ctx context.Context,
	req *chatpb.LeaveGroupRequest,
) (*chatpb.Empty, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}
	err = s.chatService.LeaveGroup(ctx, chatID, userID)
	if err != nil {
		return nil, err
	}
	return &chatpb.Empty{}, nil
}

func (s *ChatServer) GetChat(
	ctx context.Context,
	req *chatpb.GetChatRequest,
) (*chatpb.GetChatResponse, error) {
	userID, err := getUserID(ctx)
	if err != nil {
		return nil, err
	}
	chatID, err := uuid.Parse(req.ChatId)
	if err != nil {
		return nil, err
	}
	ok, err := s.chatService.IsParticipant(ctx, chatID, userID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, status.Error(codes.PermissionDenied, "not a participant")
	}
	chat, err := s.chatService.GetChat(ctx, chatID)
	if err != nil {
		return nil, err
	}
	participants, err := s.chatService.GetParticipants(ctx, chatID)
	if err != nil {
		return nil, err
	}
	pbParticipants := make([]*chatpb.Participant, 0, len(participants))
	for _, p := range participants {
		pbParticipants = append(pbParticipants, &chatpb.Participant{
			Id:          p.ID.String(),
			Username:    p.Username,
			DisplayName: p.Username,
			AvatarUrl:   "",
		})
	}
	createdBy := ""
	if chat.CreatedBy != uuid.Nil {
		createdBy = chat.CreatedBy.String()
	}
	return &chatpb.GetChatResponse{
		Chat: &chatpb.Chat{
			Id:           chat.ID.String(),
			Type:         chat.Type,
			Name:         chat.Name,
			Participants: pbParticipants,
			CreatedAt:    chat.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    chat.UpdatedAt.Format(time.RFC3339),
			CreatedBy:    createdBy,
		},
	}, nil
}
