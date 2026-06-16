package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "host=localhost port=5433 user=postgres password=postgres dbname=securetalk sslmode=disable"
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Заполнение таблицы users...")
	userStmt, err := tx.PrepareContext(ctx, "INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)")
	if err != nil {
		log.Fatal(err)
	}
	for i := 1; i <= 1000; i++ {
		uid := fmt.Sprintf("11111111-1111-1111-1111-%012d", i)
		uname := "User_" + strconv.Itoa(i)
		email := fmt.Sprintf("user_%d@example.com", i)
		mockHash := "$2a$10$FakeBcryptHashForTestingPurposesOnly"

		_, err = userStmt.ExecContext(ctx, uid, uname, email, mockHash, time.Now())
		if err != nil {
			tx.Rollback()
			log.Fatalf("Ошибка при вставке пользователя: %v", err)
		}
	}
	userStmt.Close()

	fmt.Println("Заполнение таблицы chats...")
	chatStmt, err := tx.PrepareContext(ctx, "INSERT INTO chats (id, type, name, created_at) VALUES ($1, $2, $3, $4)")
	if err != nil {
		tx.Rollback()
		log.Fatal(err)
	}

	partStmt, err := tx.PrepareContext(ctx, "INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
	if err != nil {
		tx.Rollback()
		log.Fatal(err)
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	for i := 1; i <= 1000; i++ {
		cid := fmt.Sprintf("22222222-2222-2222-2222-%012d", i)
		var chatType string
		var chatName string

		if i <= 500 {
			chatType = "private"
			chatName = "Private Chat " + strconv.Itoa(i)
		} else {
			chatType = "group"
			chatName = "Group Chat " + strconv.Itoa(i-500)
		}

		_, err = chatStmt.ExecContext(ctx, cid, chatType, chatName, time.Now())
		if err != nil {
			tx.Rollback()
			log.Fatalf("Ошибка при вставке чата: %v", err)
		}

		if chatType == "private" {
			user1 := fmt.Sprintf("11111111-1111-1111-1111-%012d", i)
			nextUserIdx := (i % 1000) + 1
			user2 := fmt.Sprintf("11111111-1111-1111-1111-%012d", nextUserIdx)

			_, _ = partStmt.ExecContext(ctx, cid, user1, time.Now())
			_, _ = partStmt.ExecContext(ctx, cid, user2, time.Now())
		} else {
			creator := fmt.Sprintf("11111111-1111-1111-1111-%012d", i)
			_, _ = partStmt.ExecContext(ctx, cid, creator, time.Now())

			memberCount := r.Intn(11) + 5
			for m := 0; m < memberCount; m++ {
				randomUserIdx := r.Intn(1000) + 1
				randomUser := fmt.Sprintf("11111111-1111-1111-1111-%012d", randomUserIdx)
				_, _ = partStmt.ExecContext(ctx, cid, randomUser, time.Now())
			}
		}
	}
	chatStmt.Close()
	partStmt.Close()

	fmt.Println("Заполнение таблицы messages...")
	msgStmt, err := tx.PrepareContext(ctx, "INSERT INTO messages (id, chat_id, sender_id, encrypted_content, sent_at) VALUES ($1, $2, $3, $4, $5)")
	if err != nil {
		tx.Rollback()
		log.Fatal(err)
	}

	smallText := make([]byte, 200)
	for i := range smallText {
		smallText[i] = 'A'
	}

	for i := 1; i <= 5000; i++ {
		msgID := fmt.Sprintf("33333333-3333-3333-3333-%012d", i)
		chatID := fmt.Sprintf("22222222-2222-2222-2222-%012d", (i%1000)+1)
		senderID := fmt.Sprintf("11111111-1111-1111-1111-%012d", r.Intn(1000)+1)

		_, err = msgStmt.ExecContext(ctx, msgID, chatID, senderID, string(smallText), time.Now())
		if err != nil {
			tx.Rollback()
			log.Fatalf("Ошибка при вставке сообщения: %v", err)
		}
	}
	msgStmt.Close()

	err = tx.Commit()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Генерация тестовых данных успешно завершена!")
}
