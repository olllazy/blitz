import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'sun' | 'ghost' | 'danger'
type Size = 'md' | 'lg' | 'sm'

type StyleProps = {
  variant?: Variant
  size?: Size
  block?: boolean
}

function classes({ variant = 'primary', size = 'md', block }: StyleProps, extra?: string) {
  return [styles.button, styles[variant], styles[size], block && styles.block, extra]
    .filter(Boolean)
    .join(' ')
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { loading?: boolean }

export function Button({
  variant,
  size,
  block,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={classes({ variant, size, block }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.dots} aria-hidden /> : null}
      <span className={loading ? styles.hidden : undefined}>{children}</span>
    </button>
  )
}

export function ButtonLink({ variant, size, block, className, ...rest }: LinkProps & StyleProps) {
  return <Link className={classes({ variant, size, block }, className)} {...rest} />
}
