import { z } from 'zod';

z.config({ jitless: true });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Ingrese su correo').max(254).pipe(z.email('Correo no válido')),
  password: z.string().min(1, 'Ingrese su contraseña').max(128, 'Máximo 128 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
