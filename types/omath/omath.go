package omath

import (
	"encoding/binary"
	"io"
)

type Vector2 struct {
	X float32
	Y float32
}

func (v Vector2) Write(w io.Writer) error {
	if err := binary.Write(w, binary.LittleEndian, v.X); err != nil {
		return err
	}
	return binary.Write(w, binary.LittleEndian, v.Y)
}

type IVector2 struct {
	X int32
	Y int32
}

func (v IVector2) Write(w io.Writer) error {
	if err := binary.Write(w, binary.LittleEndian, v.X); err != nil {
		return err
	}
	return binary.Write(w, binary.LittleEndian, v.Y)
}
