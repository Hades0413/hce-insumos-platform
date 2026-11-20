import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '@hce/core';
import { ErrorCode, Rol } from '@hce/contracts';
import { PASSWORD_HASHER, PasswordHasher } from '../../domain/security/password-hasher.port';
import { SESION_REPOSITORY, SesionRepository } from '../../domain/sesion/sesion.repository.port';
import { USUARIO_REPOSITORY, UsuarioRepository } from '../../domain/usuario/usuario.repository.port';

const DEMO_USERS: readonly { email: string; nombreCompleto: string; rol: Rol }[] = [
  { email: 'admin@hce.local', nombreCompleto: 'Administrador HCE', rol: 'ADMIN' },
  { email: 'almacen@hce.local', nombreCompleto: 'Responsable de Almacén', rol: 'ALMACENERO' },
  { email: 'farmacia@hce.local', nombreCompleto: 'Químico Farmacéutico', rol: 'FARMACEUTICO' },
  { email: 'tecnico.farmacia@hce.local', nombreCompleto: 'Técnica en Farmacia', rol: 'FARMACEUTICO' },
  { email: 'jefe.almacen@hce.local', nombreCompleto: 'Jefe de Almacén Central', rol: 'ALMACENERO' },
];

@Injectable()
export class SeedDemoUsers implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedDemoUsers.name);

  constructor(
    @Inject(USUARIO_REPOSITORY) private readonly usuarios: UsuarioRepository,
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const purgadas = await this.sesiones.purgarExpiradas().catch(() => 0);
    if (purgadas) this.logger.log(`Sesiones expiradas purgadas: ${purgadas}`);

    if (this.config.get<boolean>('SEED_DEMO_USERS') !== true) return;
    if ((await this.usuarios.contar()) > 0) return;

    const password = this.config.getOrThrow<string>('SEED_USERS_PASSWORD');
    for (const u of DEMO_USERS) {
      try {
        await this.usuarios.crear({ ...u, password: await this.hasher.hash(password) });
        this.logger.log(`Usuario demo creado: ${u.email} (${u.rol})`);
      } catch (error: unknown) {
        if (error instanceof AppError && error.code === ErrorCode.DUPLICATE) continue;
        throw error;
      }
    }
  }
}
