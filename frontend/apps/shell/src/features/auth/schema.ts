import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Ingrese su correo').max(254).pipe(z.email('Correo no válido')),
  // En login no se aplica la política de complejidad (eso es del alta): solo límites sanos.
  password: z.string().min(1, 'Ingrese su contraseña').max(128, 'Máximo 128 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
