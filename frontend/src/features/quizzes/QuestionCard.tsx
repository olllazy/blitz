import type { CSSProperties } from 'react'
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import { Button } from '../../shared/ui/Button'
import { Field, Input, TextArea } from '../../shared/ui/Field'
import { OPTION_COLORS, OPTION_NAMES } from '../../shared/ui/options'
import { OptionIcon } from '../../shared/ui/OptionIcon'
import { MAX_OPTIONS, MIN_OPTIONS, TIME_LIMITS, type QuizFormOutput, type QuizFormValues } from './schema'
import styles from './QuestionCard.module.css'

type Props = {
  form: UseFormReturn<QuizFormValues, unknown, QuizFormOutput>
  index: number
  total: number
  onRemove: () => void
  onMove: (to: number) => void
}

export function QuestionCard({ form, index, total, onRemove, onMove }: Props) {
  const { control, register, setValue, getValues, formState } = form
  const options = useFieldArray({ control, name: `questions.${index}.options` })
  const correct = useWatch({ control, name: `questions.${index}.correct` })
  const errors = formState.errors.questions?.[index]

  const removeOption = (i: number) => {
    const current = getValues(`questions.${index}.correct`)
    options.remove(i)
    // правильный ответ должен остаться на своём варианте
    if (current === i) setValue(`questions.${index}.correct`, 0, { shouldDirty: true })
    else if (current > i) setValue(`questions.${index}.correct`, current - 1, { shouldDirty: true })
  }

  return (
    <li className={styles.card}>
      <div className={styles.top}>
        <span className={styles.number}>{index + 1}</span>
        <div className={styles.tools}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={`Поднять вопрос ${index + 1}`}
          >
            ↑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(index + 1)}
            disabled={index === total - 1}
            aria-label={`Опустить вопрос ${index + 1}`}
          >
            ↓
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={total === 1}>
            Удалить
          </Button>
        </div>
      </div>

      <Field label="Вопрос" error={errors?.text?.message}>
        {(a11y) => (
          <TextArea
            rows={2}
            placeholder="Что хотите спросить?"
            {...a11y}
            {...register(`questions.${index}.text`)}
          />
        )}
      </Field>

      <fieldset className={styles.options}>
        <legend className={styles.legend}>Варианты ответа - отметьте правильный</legend>
        {options.fields.map((option, i) => (
          <div
            key={option.id}
            className={[styles.option, correct === i && styles.correct].filter(Boolean).join(' ')}
            style={{ '--tile': OPTION_COLORS[i] } as CSSProperties}
          >
            <label className={styles.radio} title="Правильный ответ">
              <input
                type="radio"
                name={`questions.${index}.correct`}
                checked={correct === i}
                onChange={() => setValue(`questions.${index}.correct`, i, { shouldDirty: true })}
                aria-label={`Вариант ${i + 1} правильный`}
              />
              <span className={styles.icon}>
                <OptionIcon index={i} size={22} />
              </span>
            </label>
            <Input
              className={styles.optionInput}
              placeholder={`Вариант ${i + 1}`}
              aria-label={`Вариант ${i + 1} (${OPTION_NAMES[i]})`}
              aria-invalid={errors?.options?.[i]?.text ? true : undefined}
              {...register(`questions.${index}.options.${i}.text`)}
            />
            {options.fields.length > MIN_OPTIONS ? (
              <button
                type="button"
                className={styles.removeOption}
                onClick={() => removeOption(i)}
                aria-label={`Убрать вариант ${i + 1}`}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
        {errors?.options?.some?.((o) => o?.text) ? (
          <p className={styles.error}>Заполните все варианты ответа</p>
        ) : null}
        {errors?.correct?.message ? <p className={styles.error}>{errors.correct.message}</p> : null}
      </fieldset>

      <div className={styles.bottom}>
        <label className={styles.time}>
          <span>Время</span>
          <select {...register(`questions.${index}.timeLimit`, { valueAsNumber: true })}>
            {TIME_LIMITS.map((s) => (
              <option key={s} value={s}>
                {s} сек
              </option>
            ))}
          </select>
        </label>
        {options.fields.length < MAX_OPTIONS ? (
          <Button variant="ghost" size="sm" onClick={() => options.append({ text: '' })}>
            + вариант
          </Button>
        ) : null}
      </div>
    </li>
  )
}
