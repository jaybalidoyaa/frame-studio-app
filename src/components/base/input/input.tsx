import type { InputProps as AriaInputProps } from 'react-aria-components'
import { Input as AriaInput } from 'react-aria-components'
import { cx } from '../../../utils/cx'

export function Input({ className, ...props }: AriaInputProps) {
  return (
    <AriaInput
      {...props}
      className={(values) =>
        cx(
          'w-full rounded-lg bg-primary px-3.5 py-2.5 text-sm text-fg-primary shadow-xs',
          'ring-1 ring-inset ring-border-primary placeholder:text-placeholder',
          'outline-none transition duration-100',
          'hover:bg-primary_hover focus:ring-2 focus:ring-brand-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          typeof className === 'function' ? className(values) : className,
        )
      }
    />
  )
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'w-full rounded-lg bg-primary px-3.5 py-2.5 text-sm text-fg-primary shadow-xs',
        'ring-1 ring-inset ring-border-primary placeholder:text-placeholder',
        'outline-none transition duration-100',
        'hover:bg-primary_hover focus:ring-2 focus:ring-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    />
  )
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        'w-full appearance-none rounded-lg bg-primary px-3.5 py-2.5 text-sm text-fg-primary shadow-xs',
        'ring-1 ring-inset ring-border-primary outline-none transition duration-100',
        'hover:bg-primary_hover focus:ring-2 focus:ring-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </select>
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-secondary"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-tertiary">{hint}</p> : null}
    </div>
  )
}
