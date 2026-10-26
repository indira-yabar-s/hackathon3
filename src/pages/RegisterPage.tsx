import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toApiError } from '../api/errors';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import type { ApiError, RegisterRequest } from '../types/api';

type RegisterField = keyof RegisterRequest;
type FieldErrors = Partial<Record<RegisterField, string>>;

function isRegisterField(field: string): field is RegisterField {
  return field === 'teamName' || field === 'email' || field === 'password';
}

// Errores 409 que corresponden a un campo concreto
const FIELD_BY_CODE: Record<string, RegisterField> = {
  EMAIL_ALREADY_REGISTERED: 'email',
  TEAM_NAME_TAKEN: 'teamName',
};

// Reparte el error del servidor entre los campos; lo que no tenga campo va como error general
function mapRegisterError(apiError: ApiError): { fieldErrors: FieldErrors; formError: string | null } {
  const fieldForCode = FIELD_BY_CODE[apiError.code];
  if (fieldForCode) {
    return { fieldErrors: { [fieldForCode]: apiError.message }, formError: null };
  }

  if (apiError.code === 'VALIDATION_ERROR' && apiError.details) {
    const fieldErrors: FieldErrors = {};
    for (const detail of apiError.details) {
      // El servidor puede mandar "email", "body.email" o "/email"
      const field = detail.field.split(/[./]/).pop() ?? '';
      if (isRegisterField(field)) fieldErrors[field] = detail.message;
    }
    const hasFieldErrors = Object.keys(fieldErrors).length > 0;
    return { fieldErrors, formError: hasFieldErrors ? null : apiError.message };
  }

  return { fieldErrors: {}, formError: apiError.message };
}

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();

  const [form, setForm] = useState<RegisterRequest>({ teamName: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: RegisterField, value: string) {
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
      // Si sale bien, el registro deja la sesión iniciada y PublicOnlyRoute entra a la app
      await register(form);
    } catch (error) {
      const mapped = mapRegisterError(toApiError(error));
      setFieldErrors(mapped.fieldErrors);
      setFormError(mapped.formError);
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Registrar tripulación" subtitle="Crea la cuenta de tu equipo de cazarrecompensas.">
      {/* noValidate: las reglas las valida el servidor y mostramos sus errores en cada campo */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          id="teamName"
          label="Nombre de la tripulación"
          autoComplete="organization"
          value={form.teamName}
          error={fieldErrors.teamName}
          onChange={(value) => updateField('teamName', value)}
        />
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
          autoComplete="new-password"
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
          {submitting ? 'Registrando…' : 'Registrar y zarpar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Ya tienen cuenta?{' '}
        <Link to="/login" state={location.state} className="font-semibold text-amber-400 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthCard>
  );
}
