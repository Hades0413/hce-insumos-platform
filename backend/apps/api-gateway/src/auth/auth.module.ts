import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthFacade } from './auth.facade';
import { SessionEventsController } from './revocation/session-events.controller';

@Module({
  controllers: [AuthController, SessionEventsController],
  providers: [AuthFacade],
  exports: [AuthFacade],
})
export class AuthModule {}
