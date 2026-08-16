import { cx, sortCx } from '../../../utils/cx'

const styles = sortCx({
  base: 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  colors: {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    gray: 'bg-utility-gray-50 text-utility-gray-700 ring-utility-gray-200',
    success: 'bg-success-50 text-success-700 ring-success-200',
    warning: 'bg-warning-50 text-warning-700 ring-warning-200',
    error: 'bg-error-50 text-error-700 ring-error-200',
    gold: 'bg-warning-50 text-warning-800 ring-warning-300',
  },
})

export function Badge({
  children,
  color = 'gray',
  className,
}: {
  children: React.ReactNode
  color?: keyof typeof styles.colors
  className?: string
}) {
  return (
    <span className={cx(styles.base, styles.colors[color], className)}>
      {children}
    </span>
  )
}
