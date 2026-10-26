import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toApiError } from '../api/errors';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import type { LoginRequest } from '../types/api';

type LoginField = keyof LoginRequest;
type FieldErrors = Partial<Record<LoginField, string>>;

function isLoginField(field: string): field is LoginField {
  return field === 'email' || field === 'password';
}

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();

  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: LoginField, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await login(form);
      // No navegamos aquí: PublicOnlyRoute ve la sesión y redirige a "from"
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'INVALID_CREDENTIALS') {
        // La API no dice cuál campo falló → error general
        setFormError('Email o contraseña incorrectos.');
      } else if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors: FieldErrors = {};
        for (const detail of apiError.details) {
          const field = detail.field.split(/[./]/).pop() ?? '';
          if (isLoginField(field)) errors[field] = detail.message;
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length === 0) setFormError(apiError.message);
      } else {
        setFormError(apiError.message);
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Iniciar sesión" subtitle="Ingresa con la cuenta de tu tripulación.">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          error={fieldErrors.email}
          onChange={(value) => updateField('email', value)}
        />
        <FormField
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={form.password}
          error={fieldErrors.password}
          onChange={(value) => updateField('password', value)}
        />

        {formError && (
          <p role="alert" className="rounded-lg bg-red-950/60 p-3 text-sm text-red-300">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-amber-400 py-2 font-semibold text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Tu tripulación no tiene cuenta?{' '}
        {/* Pasamos el state para no perder "from" si el usuario se registra */}
        <Link to="/register" state={location.state} className="font-semibold text-amber-400 hover:underline">
          Regístrala
        </Link>
      </p>
    </AuthCard>
  );
}
