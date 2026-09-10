import { Global, Module } from '@nestjs/common';
import { createStorageProvider, type StorageEnv } from '@open-derja/core';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { StorageLocalController } from './storage-local.controller';
import { STORAGE_PROVIDER } from './storage.tokens';

@Global()
@Module({
  controllers: [StorageController, StorageLocalController],
  providers: [
    StorageService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: () => createStorageProvider(process.env as unknown as StorageEnv),
    },
  ],
  exports: [StorageService, STORAGE_PROVIDER],
})
export class StorageModule {}
