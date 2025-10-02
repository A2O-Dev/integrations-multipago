import { Module } from '@nestjs/common'

import { ValidationService } from './services'
import { CacheModule } from '@nestjs/cache-manager'

@Module({
  imports: [CacheModule.register()],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class CommonModule {}
