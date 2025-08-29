//go:build singleexe

package main

import (
	"embed"
	"net/http"

	"github.com/gofiber/fiber/v2/middleware/filesystem"
)

//go:embed public/*
var publicDir embed.FS

func init() {
	publicHandler = filesystem.New(filesystem.Config{
		Root:       http.FS(&publicDir),
		PathPrefix: "/public",
	})
}
