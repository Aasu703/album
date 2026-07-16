import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { ArtworksModule } from './artworks/artworks.module';
import { EngagementModule } from './engagement/engagement.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global IP-based rate limiting: 100 requests per minute per client by default.
    // Auth endpoints tighten this further with a dedicated @Throttle() decorator.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    UsersModule,
    ArtworksModule,
    EngagementModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply the throttler globally as an APP_GUARD so every route is rate-limited by default.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
