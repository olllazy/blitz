import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react'
import styles from './Field.module.css'

type FieldProps = {
  label: ReactNode
  error?: string
  hint?: string
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
}

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const noteId = `${id}-note`
  const note = error ?? hint

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': note ? noteId : undefined,
      })}
      {note ? (
        <p id={noteId} className={error ? styles.error : styles.hint} role={error ? 'alert' : undefined}>
          {note}
        </p>
      ) : null}
    </div>
  )
}

export function Input({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
}

export function TextArea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      ref={ref}
      className={[styles.input, styles.textarea, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}
