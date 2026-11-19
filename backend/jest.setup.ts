import { Logger } from '@nestjs/common';

// Tests silenciosos: los logs se validan por comportamiento, no por consola.
Logger.overrideLogger(false);
