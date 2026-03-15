all: build/game

.PHONY: clean client dev-server dev-client

dev: dev-server dev-client

dev-server:
	go run .

dev-client:
	cd client && bun run dev

build/game: build client
	go build -o build/game .

build:
	mkdir -p build

public:
	mkdir -p public

client: public
	cd client && VITE_PUBLIC_ENABLE_TEST_SCENE=false bun run build

clean:
	rm -rf build