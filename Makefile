all: build/game

.PHONY: clean client

build/game: build client
	go build -tags singleexe -o build/game .

build:
	mkdir -p build

public:
	mkdir -p public

client: public
	cd client && bun run build

clean:
	rm -rf build