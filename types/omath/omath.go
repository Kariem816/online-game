package omath

import (
	"encoding/binary"
	"io"

	"github.com/chewxy/math32"
)

type Vector2 struct {
	X float32
	Y float32
}

func (v Vector2) Polar() Polar {
	r := math32.Sqrt(v.X*v.X + v.Y*v.Y)
	theta := math32.Atan2(v.Y, v.X)
	return Polar{R: r, Theta: theta}
}

func (v Vector2) Write(w io.Writer) error {
	if err := binary.Write(w, binary.LittleEndian, v.X); err != nil {
		return err
	}
	return binary.Write(w, binary.LittleEndian, v.Y)
}

type Polar struct {
	R     float32
	Theta float32
}

func (p Polar) Vector2() Vector2 {
	x := p.R * math32.Cos(p.Theta)
	y := p.R * math32.Sin(p.Theta)
	return Vector2{X: x, Y: y}
}

func (p Polar) Write(w io.Writer) error {
	if err := binary.Write(w, binary.LittleEndian, p.R); err != nil {
		return err
	}
	return binary.Write(w, binary.LittleEndian, p.Theta)
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
