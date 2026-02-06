/**
 * Login Form Component
 *
 * @description
 * Enhanced login form with React Hook Form and Zod validation
 *
 * @module components/auth/LoginForm
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {

  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Zod schema for login form validation
 */
const loginSchema = z.object({
  email: z
    .string({
      required_error: 'Email é obrigatório',
      invalid_type_error: 'Email deve ser uma string',
    })
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(254, 'Email muito longo')
    .trim()
    .toLowerCase(),
  password: z
    .string({
      required_error: 'Senha é obrigatória',
      invalid_type_error: 'Senha deve ser uma string',
    })
    .min(1, 'Senha é obrigatória')
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(128, 'Senha muito longa'),
});

/**
 * Login form data type
 */
export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Props for the LoginForm component
 */
interface LoginFormProps {
  /** Submit handler - receives validated form data */
  onSubmit: (data: LoginFormData) => void | Promise<void>;
  /** Loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Active tab for accessibility */
  activeTab?: 'login' | 'register';
  /** Default email value */
  defaultEmail?: string;
}

/**
 * Enhanced Login Form with validation
 *
 * @example
 * ```tsx
 * const handleSubmit = async (data: LoginFormData) => {
 *   await signIn(data.email, data.password);
 * };
 *
 * <LoginForm
 *   onSubmit={handleSubmit}
 *   loading={isLoading}
 *   error={errorMessage}
 * />
 * ```
 */
export function LoginForm({
  onSubmit,
  loading = false,
  error = null,
  activeTab = 'login',
  defaultEmail = '',
}: LoginFormProps) {
  // React Hook Form with Zod validation
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: '',
    },
    mode: 'onBlur', // Validate on blur for better UX
  });

  // Form submission handler
  const handleSubmit = async (data: LoginFormData) => {
    try {
      await onSubmit(data);
    } catch (err) {
      // Error is handled by parent component and passed via error prop
      logger.error('Login error', err, 'LoginForm');
    }
  };

  // Check if form has errors after user interaction
  const hasBeenTouched = form.formState.isDirty;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="space-y-4">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel htmlFor="login-email" className="text-sm font-medium">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nome@exemplo.com"
                    autoComplete="email"
                    className="h-11"
                    tabIndex={activeTab === 'login' ? 1 : -1}
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel htmlFor="login-password" className="text-sm font-medium">
                    Senha
                  </FormLabel>
                  <button
                    type="button"
                    className="text-xs text-primary hover:text-primary/80 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                    tabIndex={activeTab === 'login' ? 5 : -1}
                    onClick={() => {
                      logger.debug('Forgot password clicked', null, 'LoginForm');
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <FormControl>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-11"
                    tabIndex={activeTab === 'login' ? 2 : -1}
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Error Alert */}
        {(error || (hasBeenTouched && hasErrors)) && (
          <Alert
            variant="destructive"
            className="animate-slide-up-fade"
            data-testid="login-error"
          >
            <AlertDescription className="text-sm">
              {error || 'Por favor, corrija os erros no formulário.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-11 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-150 active:scale-[0.98]"
          disabled={loading}
          tabIndex={activeTab === 'login' ? 3 : -1}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Entrando...
            </>
          ) : (
            'Entrar na Plataforma'
          )}
        </Button>
      </form>
    </Form>
  );
}

/**
 * Default export
 */
export default LoginForm;
