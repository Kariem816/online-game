package omath

import (
	"math/rand"
)

func RandMN(m, n int32) int32 {
	return m + rand.Int31n(n-m)
}
