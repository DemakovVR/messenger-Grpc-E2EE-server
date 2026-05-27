package grpc

import (
	"bytes"
	"errors"
	"io"
	"os"

	filepb "Server/gen/file"
	"Server/internal/middleware"
	"Server/internal/service"

	"github.com/google/uuid"
)

type FileServer struct {
	filepb.UnimplementedFileServiceServer
	service      *service.FileService
	auditService *service.AuditService
}

func NewFileServer(
	service *service.FileService,
	auditService *service.AuditService,
) *FileServer {
	return &FileServer{
		service:      service,
		auditService: auditService,
	}
}

func (s *FileServer) UploadFile(
	stream filepb.FileService_UploadFileServer,
) error {

	var (
		fileName string
		buffer   bytes.Buffer
	)

	for {
		req, err := stream.Recv()

		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		if fileName == "" {
			fileName = req.FileName
		}

		buffer.Write(req.Chunk)
	}

	userIDStr, ok := stream.Context().Value(middleware.UserIDKey).(string)
	if !ok {
		return errors.New("unauthorized: missing user id")
	}

	uploaderID, err := uuid.Parse(userIDStr)
	if err != nil {
		return errors.New("unauthorized: invalid user id")
	}

	file, err := s.service.SaveUploadedFile(
		uploaderID,
		fileName,
		buffer.Bytes(),
	)
	if err != nil {
		return err
	}

	_ = s.auditService.Log(
		stream.Context(),
		uploaderID,
		"file_upload",
		&file.FilePath,
	)

	return stream.SendAndClose(&filepb.UploadFileResponse{
		FileUrl: file.FilePath,
	})
}

func (s *FileServer) DownloadFile(
	req *filepb.DownloadFileRequest,
	stream filepb.FileService_DownloadFileServer,
) error {

	file, err := os.Open(req.FileUrl)
	if err != nil {
		return err
	}
	defer file.Close()

	userIDStr := stream.Context().Value(middleware.UserIDKey).(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return err
	}

	_ = s.auditService.Log(
		stream.Context(),
		userID,
		"file_download",
		&req.FileUrl,
	)

	buf := make([]byte, 32*1024)

	for {
		n, err := file.Read(buf)

		if n > 0 {
			if sendErr := stream.Send(&filepb.DownloadFileResponse{
				Chunk: buf[:n],
			}); sendErr != nil {
				return sendErr
			}
		}

		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}
