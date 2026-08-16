import type { ButtonProps as AriaButtonProps } from 'react-aria-components'
import { Button as AriaButton } from 'react-aria-components'
import { cx, sortCx } from '../../../utils/cx'

const styles = sortCx({
  common:
    'group relative inline-flex cursor-pointer items-center justify-center whitespace-nowrap font-semibold outline-none transition duration-100 ease-linear focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
  sizes: {
    sm: 'gap-1.5 rounded-lg px-3 py-2 text-sm',
    md: 'gap-1.5 rounded-lg px-3.5 py-2.5 text-sm',
    lg: 'gap-2 rounded-lg px-4 py-2.5 text-md',
  },
  colors: {
    primary:
      'bg-brand-600 text-white shadow-xs ring-1 ring-inset ring-transparent hover:bg-brand-700',
    secondary:
      'bg-primary text-secondary shadow-xs ring-1 ring-inset ring-border-primary hover:bg-primary_hover hover:text-secondary_hover',
    tertiary: 'text-tertiary hover:bg-primary_hover hover:text-tertiary_hover',
    'primary-destructive':
      'bg-error-600 text-white shadow-xs ring-1 ring-inset ring-transparent hover:bg-error-700',
    'secondary-destructive':
      'bg-primary text-error-700 shadow-xs ring-1 ring-inset ring-error-300 hover:bg-error-50',
  },
})

export interface ButtonProps extends AriaButtonProps {
  size?: keyof typeof styles.sizes
  color?: keyof typeof styles.colors
  className?: string
}

export function Button({
  size = 'sm',
  color = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={cx(
        styles.common,
        styles.sizes[size],
        styles.colors[color],
        className,
      )}
    >
      {children}
    </AriaButton>
  )
}
