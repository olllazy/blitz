package game

import (
	"math"
	"time"
)

const (
	maxPoints   = 1000
	streakBonus = 100
	maxStreak   = 3
)

// от 1000 очков за мгновенный ответ до 500 за ответ на последней секунде,
// плюс бонус за серию; streak - номер правильного ответа подряд, начиная с 1
func Points(elapsed, limit time.Duration, streak int) int {
	if limit <= 0 || elapsed > limit {
		return 0
	}
	if elapsed < 0 {
		elapsed = 0
	}

	ratio := float64(elapsed) / float64(limit)
	base := int(math.Round(maxPoints * (1 - ratio/2)))
	bonus := min(max(streak-1, 0), maxStreak) * streakBonus

	return base + bonus
}
