package grpc

import (
	"bytes"
	"io"

	filepb "Server/gen/file"
	"Server/internal/repository"
	"Server/internal/service"
)

type FileServer struct {
	filepb.UnimplementedFileServiceServer

	service *service.FileService
	repo    *repository.FileRepository
}

func NewFileServer(
	service *service.FileService,
	repo *repository.FileRepository,
) *FileServer {

	return &FileServer{
		service: service,
		repo:    repo,
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

	path := s.service.GenerateFilePath(fileName)

	if err := s.service.SaveFile(path, buffer.Bytes()); err != nil {
		return err
	}

	return stream.SendAndClose(&filepb.UploadFileResponse{
		FileUrl: path,
	})
}

func (s *FileServer) DownloadFile(
	req *filepb.DownloadFileRequest,
	stream filepb.FileService_DownloadFileServer,
) error {

	file, err := s.service.OpenFile(req.FileUrl)
	if err != nil {
		return err
	}
	defer file.Close()

	buf := make([]byte, 32*1024)

	for {
		n, err := file.Read(buf)

		if n > 0 {
			if err := stream.Send(&filepb.DownloadFileResponse{
				Chunk: buf[:n],
			}); err != nil {
				return err
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
