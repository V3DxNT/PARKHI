FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /go-backend ./cmd/server/main.go

FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

COPY --from=builder /go-backend /app/go-backend

RUN mkdir -p /app/data/previews /app/data/geotiffs /app/data/overlays /app/data/raw /app/data/reports

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["/app/go-backend"]
