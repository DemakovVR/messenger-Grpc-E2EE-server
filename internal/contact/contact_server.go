package contact

import (
	"context"

	contactpb "Server/gen/contact"
	"Server/internal/contextkeys"

	"github.com/google/uuid"
)

type ContactServer struct {
	contactpb.UnimplementedContactServiceServer

	contactService *ContactService
}

func NewContactServer(
	contactService *ContactService,
) *ContactServer {
	return &ContactServer{
		contactService: contactService,
	}
}

func (s *ContactServer) SearchUsers(
	ctx context.Context,
	req *contactpb.SearchUsersRequest,
) (*contactpb.SearchUsersResponse, error) {

	users, err := s.contactService.SearchUsers(
		ctx,
		req.Query,
	)
	if err != nil {
		return nil, err
	}

	var result []*contactpb.User

	for _, user := range users {
		result = append(result, &contactpb.User{
			Id:       user.ID.String(),
			Username: user.Username,
			Email:    user.Email,
		})
	}

	return &contactpb.SearchUsersResponse{
		Users: result,
	}, nil
}

func (s *ContactServer) AddContact(
	ctx context.Context,
	req *contactpb.AddContactRequest,
) (*contactpb.AddContactResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	contactID, err := uuid.Parse(req.ContactId)
	if err != nil {
		return nil, err
	}

	err = s.contactService.AddContact(
		ctx,
		userID,
		contactID,
	)
	if err != nil {
		return nil, err
	}

	return &contactpb.AddContactResponse{
		Message: "Contact added",
	}, nil
}

func (s *ContactServer) GetContacts(
	ctx context.Context,
	req *contactpb.GetContactsRequest,
) (*contactpb.GetContactsResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	contacts, err := s.contactService.GetContacts(
		ctx,
		userID,
	)
	if err != nil {
		return nil, err
	}

	var result []*contactpb.User

	for _, user := range contacts {
		result = append(result, &contactpb.User{
			Id:       user.ID.String(),
			Username: user.Username,
			Email:    user.Email,
		})
	}

	return &contactpb.GetContactsResponse{
		Contacts: result,
	}, nil
}

func (s *ContactServer) DeleteContact(
	ctx context.Context,
	req *contactpb.DeleteContactRequest,
) (*contactpb.DeleteContactResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	contactID, err := uuid.Parse(req.ContactId)
	if err != nil {
		return nil, err
	}

	err = s.contactService.DeleteContact(ctx, userID, contactID)
	if err != nil {
		return nil, err
	}

	return &contactpb.DeleteContactResponse{
		Message: "contact deleted",
	}, nil
}

func (s *ContactServer) BlockContact(
	ctx context.Context,
	req *contactpb.BlockContactRequest,
) (*contactpb.BlockContactResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	blockedID, err := uuid.Parse(req.ContactId)
	if err != nil {
		return nil, err
	}

	err = s.contactService.BlockContact(ctx, userID, blockedID)
	if err != nil {
		return nil, err
	}

	return &contactpb.BlockContactResponse{
		Message: "user blocked",
	}, nil
}

func (s *ContactServer) UnblockContact(
	ctx context.Context,
	req *contactpb.UnblockContactRequest,
) (*contactpb.UnblockContactResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	blockedID, err := uuid.Parse(req.ContactId)
	if err != nil {
		return nil, err
	}

	err = s.contactService.UnblockContact(ctx, userID, blockedID)
	if err != nil {
		return nil, err
	}

	return &contactpb.UnblockContactResponse{
		Message: "user unblocked",
	}, nil
}

func (s *ContactServer) GetBlockedUsers(
	ctx context.Context,
	req *contactpb.GetBlockedUsersRequest,
) (*contactpb.GetBlockedUsersResponse, error) {

	userIDStr := ctx.Value(contextkeys.UserIDKey).(string)

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, err
	}

	users, err := s.contactService.GetBlockedUsers(ctx, userID)
	if err != nil {
		return nil, err
	}

	var result []*contactpb.User

	for _, user := range users {
		result = append(result, &contactpb.User{
			Id:       user.ID.String(),
			Username: user.Username,
			Email:    user.Email,
		})
	}

	return &contactpb.GetBlockedUsersResponse{
		Users: result,
	}, nil
}
