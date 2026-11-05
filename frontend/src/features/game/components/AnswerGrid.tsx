import type { CSSProperties } from 'react'
import { OPTION_COLORS, OPTION_NAMES } from '../../../shared/ui/options'
import { OptionIcon } from '../../../shared/ui/OptionIcon'
import styles from './AnswerGrid.module.css'

type Props = {
  options: string[]
  onPick?: (index: number) => void
  picked?: number
  correct?: number
  counts?: number[]
  disabled?: boolean
  dark?: boolean
}

export function AnswerGrid({ options, onPick, picked = -1, correct, counts, disabled, dark }: Props) {
  const revealed = correct !== undefined
  const max = counts ? Math.max(1, ...counts) : 1

  return (
    <div className={[styles.grid, dark && styles.dark].filter(Boolean).join(' ')}>
      {options.map((text, i) => {
        const state = revealed
          ? i === correct
            ? undefined
            : styles.wrong
          : picked === -1
            ? undefined
            : i === picked
              ? styles.picked
              : styles.dimmed

        return (
          <button
            key={i}
            type="button"
            className={[styles.tile, state].filter(Boolean).join(' ')}
            style={{ '--tile': OPTION_COLORS[i] } as CSSProperties}
            onClick={onPick ? () => onPick(i) : undefined}
            disabled={disabled || !onPick}
            aria-pressed={onPick ? picked === i : undefined}
            aria-label={`${OPTION_NAMES[i]}: ${text}${revealed && i === correct ? ', правильный ответ' : ''}`}
          >
            <span className={styles.icon}>
              <OptionIcon index={i} size={28} />
            </span>
            <span className={styles.text}>{text}</span>
            {counts ? (
              <span className={styles.count}>
                <span className={styles.bar} style={{ '--fill': counts[i] / max } as CSSProperties} />
                <b>{counts[i]}</b>
              </span>
            ) : null}
            {revealed && i === correct ? (
              <span className={styles.check} aria-hidden>
                ✓
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
