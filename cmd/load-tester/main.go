package main

import (
	"context"
	"crypto/tls"
	"flag"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"

	pb "Server/gen/message"
)

var (
	serverAddr    = flag.String("server", "localhost:50051", "gRPC server address")
	concurrency   = flag.Int("c", 200, "number of concurrent workers")
	totalRequests = flag.Int("n", 10000, "total number of messages to send")
	chatID        = flag.String("chat", "bd52680a-dfd2-4f57-895f-c3d25ab29fc5", "chat ID")
	token         = flag.String("token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNDVlOGNlNGQtZDM5MS00MWUzLTkwYWItYWVhY2RjMjYyMDQyIiwiZXhwIjoxNzgxMTE3MTM3LCJpYXQiOjE3ODEwMzA3Mzd9.FIEWJkItXl8f42cds4hd5xvxVIGZsdGqkuHCbMsK05A", "JWT access token")
)

func main() {
	flag.Parse()
	fmt.Printf("=== Load test SecureTalk SendMessage ===\n")
	fmt.Printf("Server: %s, concurrency: %d, total: %d, chat: %s\n", *serverAddr, *concurrency, *totalRequests, *chatID)

	tlsConfig := &tls.Config{InsecureSkipVerify: true}
	creds := credentials.NewTLS(tlsConfig)
	conn, err := grpc.Dial(*serverAddr, grpc.WithTransportCredentials(creds))
	if err != nil {
		log.Fatal("Connection failed:", err)
	}
	defer conn.Close()
	client := pb.NewMessageServiceClient(conn)

	latencies := make(chan time.Duration, *totalRequests)
	reqPerWorker := *totalRequests / *concurrency
	var wg sync.WaitGroup
	start := time.Now()

	for i := 0; i < *concurrency; i++ {
		wg.Add(1)
		go worker(i, reqPerWorker, client, latencies, &wg)
	}
	wg.Wait()
	close(latencies)
	duration := time.Since(start)

	var all []time.Duration
	for lat := range latencies {
		all = append(all, lat)
	}
	sort.Slice(all, func(i, j int) bool { return all[i] < all[j] })

	success := len(all)
	if success == 0 {
		fmt.Println("No successful requests")
		return
	}

	avg := sum(all) / time.Duration(success)
	rps := float64(success) / duration.Seconds()
	p50 := percentile(all, 0.50)
	p90 := percentile(all, 0.90)
	p95 := percentile(all, 0.95)
	p99 := percentile(all, 0.99)

	fmt.Println("\n=== RESULTS ===")
	fmt.Printf("Total time:       %v\n", duration)
	fmt.Printf("Success:          %d / %d\n", success, *totalRequests)
	fmt.Printf("RPS:              %.2f\n", rps)
	fmt.Printf("Min latency:      %v\n", all[0])
	fmt.Printf("Avg latency:      %v\n", avg)
	fmt.Printf("p50 latency:      %v\n", p50)
	fmt.Printf("p90 latency:      %v\n", p90)
	fmt.Printf("p95 latency:      %v\n", p95)
	fmt.Printf("p99 latency:      %v\n", p99)
	fmt.Printf("Max latency:      %v\n", all[success-1])
}

func worker(id, count int, client pb.MessageServiceClient, out chan<- time.Duration, wg *sync.WaitGroup) {
	defer wg.Done()
	for i := 0; i < count; i++ {
		payload := fmt.Sprintf("E2EE_payload_%d_%d", id, i)
		req := &pb.SendMessageRequest{
			ChatId:           *chatID,
			EncryptedContent: payload,
			IsEncrypted:      true,
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		md := metadata.Pairs("authorization", "Bearer "+*token)
		ctx = metadata.NewOutgoingContext(ctx, md)

		start := time.Now()
		_, err := client.SendMessage(ctx, req)
		cancel()
		if err != nil {
			log.Printf("Worker %d error: %v", id, err)
			continue
		}
		out <- time.Since(start)
	}
}

func sum(l []time.Duration) time.Duration {
	var s time.Duration
	for _, v := range l {
		s += v
	}
	return s
}

func percentile(l []time.Duration, p float64) time.Duration {
	if len(l) == 0 {
		return 0
	}
	idx := int(float64(len(l)) * p)
	if idx >= len(l) {
		idx = len(l) - 1
	}
	return l[idx]
}
