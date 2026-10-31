import type { AnyFieldApi } from '@tanstack/react-form'
import type { ComponentProps, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type InputProps = Omit<ComponentProps<'input'>, 'id' | 'name' | 'value' | 'onChange' | 'onBlur'>

/** Labelled text input bound to a TanStack Form field; its error shows once the field is left or the form is submitted. */
export function AuthField({ field, label, labelAction, ...props }: { field: AnyFieldApi; label: string; labelAction?: ReactNode } & InputProps) {
  const { meta } = field.state
  const shown = meta.isBlurred || field.form.state.submissionAttempts > 0
  const error = shown ? meta.errors.find(Boolean) : undefined
  const errorId = `${field.name}-error`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.name}>{label}</Label>
        {labelAction}
      </div>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="h-10"
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {String(error)}
        </p>
      )}
    </div>
  )
}
