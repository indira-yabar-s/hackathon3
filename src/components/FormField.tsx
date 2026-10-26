import type { ChangeEvent } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  error?: string | undefined;
  autoComplete?: string;
  onChange: (value: string) => void;
}

// Input con su label y su error del servidor justo debajo
export function FormField({ id, label, type = 'text', value, error, autoComplete, onChange }: FormFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-300">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-amber-400 ${
          error ? 'border-red-500' : 'border-slate-600'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
