// import { Injectable } from '@nestjs/common';
// import {
//   EntitySubscriberInterface,
//   InsertEvent,
//   UpdateEvent,
//   RemoveEvent,
//   DataSource,
// } from 'typeorm';
// import Redis from 'ioredis';

// @Injectable()
// export class CacheSubscriber implements EntitySubscriberInterface {
//   private redis: Redis;

//   constructor(private dataSource: DataSource) {
//     this.dataSource.subscribers.push(this);
//     // TODO: Inject Redis service instead of creating new connection
//     this.redis = new Redis({
//       host: process.env.REDIS_HOST || 'localhost',
//       port: Number(process.env.REDIS_PORT) || 6379,
//       password: process.env.REDIS_PASSWORD,
//     });
//   }

//   afterInsert(event: InsertEvent<any>) {
//     this.invalidateCache('INSERT', event.entity);
//   }

//   afterUpdate(event: UpdateEvent<any>) {
//     this.invalidateCache('UPDATE', event.entity);
//   }

//   afterRemove(event: RemoveEvent<any>) {
//     this.invalidateCache('DELETE', event.entity);
//   }

//   private async invalidateCache(operation: string, entity: any) {
//     const entityName = entity.constructor.name;
//     const entityId = entity.id;

//     console.log(
//       `[CacheSubscriber] Invalidating cache for ${operation} on ${entityName}:${entityId}`,
//     );

//     // Define cache keys to invalidate based on entity type
//     const cacheKeys = this.getCacheKeys(entityName, entityId, entity);

//     // Actually invalidate cache in Redis
//     if (cacheKeys.length > 0) {
//       try {
//         const deletedCount = await this.redis.del(...cacheKeys);
//         console.log(
//           `[CacheSubscriber] Deleted ${deletedCount} cache keys:`,
//           cacheKeys,
//         );
//       } catch (error) {
//         console.error('[CacheSubscriber] Error deleting cache keys:', error);
//       }
//     }
//   }

//   private getCacheKeys(
//     entityName: string,
//     entityId: string,
//     entity: any,
//   ): string[] {
//     const keys: string[] = [];

//     switch (entityName) {
//       case 'User':
//         keys.push(
//           `user:${entityId}`,
//           `user:profile:${entityId}`,
//           `user:posts:${entityId}`,
//           `user:followers:${entityId}`,
//           `user:following:${entityId}`,
//           `user:likes:${entityId}`,
//           `user:comments:${entityId}`,
//           `user:feed:${entityId}`,
//           'users:trending',
//           'users:search',
//           'users:popular',
//           'users:verified',
//         );
//         break;

//       case 'Post':
//         keys.push(
//           `post:${entityId}`,
//           `post:comments:${entityId}`,
//           `post:likes:${entityId}`,
//           `post:shares:${entityId}`,
//           `user:posts:${entity.authorId}`,
//           `user:feed:${entity.authorId}`,
//           'posts:trending',
//           'posts:latest',
//           'posts:popular',
//           'posts:search',
//           'posts:hashtag:*', // Invalidate all hashtag caches
//           'feed:global',
//           'feed:trending',
//         );
//         break;

//       case 'Comment':
//         keys.push(
//           `comment:${entityId}`,
//           `post:comments:${entity.postId}`,
//           `post:${entity.postId}`,
//           `user:comments:${entity.authorId}`,
//           `user:feed:${entity.postAuthorId}`,
//         );
//         break;

//       case 'Like':
//         keys.push(
//           `post:likes:${entity.contentId}`,
//           `user:likes:${entity.userId}`,
//           `post:${entity.contentId}`,
//           `user:posts:${entity.contentOwnerId}`,
//           'posts:trending',
//           'posts:popular',
//         );
//         break;

//       case 'Follow':
//         keys.push(
//           `user:followers:${entity.followedId}`,
//           `user:following:${entity.followerId}`,
//           `user:${entity.followedId}`,
//           `user:${entity.followerId}`,
//           `user:feed:${entity.followerId}`,
//           'users:popular',
//           'users:trending',
//         );
//         break;

//       case 'Hashtag':
//         keys.push(
//           `hashtag:${entityId}`,
//           `hashtag:posts:${entityId}`,
//           'hashtags:trending',
//           'hashtags:popular',
//         );
//         break;

//       default:
//         keys.push(`${entityName.toLowerCase()}:${entityId}`);
//     }

//     return keys;
//   }

//   // Helper method to invalidate specific cache patterns
//   async invalidatePattern(pattern: string): Promise<void> {
//     try {
//       const keys = await this.redis.keys(pattern);
//       if (keys.length > 0) {
//         const deletedCount = await this.redis.del(...keys);
//         console.log(
//           `[CacheSubscriber] Deleted ${deletedCount} keys matching pattern: ${pattern}`,
//         );
//       }
//     } catch (error) {
//       console.error('[CacheSubscriber] Error invalidating pattern:', error);
//     }
//   }

//   // Helper method to invalidate user-related caches
//   async invalidateUserCaches(userId: string): Promise<void> {
//     const userKeys = [
//       `user:${userId}`,
//       `user:profile:${userId}`,
//       `user:posts:${userId}`,
//       `user:followers:${userId}`,
//       `user:following:${userId}`,
//       `user:likes:${userId}`,
//       `user:comments:${userId}`,
//       `user:feed:${userId}`,
//     ];

//     try {
//       const deletedCount = await this.redis.del(...userKeys);
//       console.log(
//         `[CacheSubscriber] Deleted ${deletedCount} user cache keys for user: ${userId}`,
//       );
//     } catch (error) {
//       console.error('[CacheSubscriber] Error invalidating user caches:', error);
//     }
//   }

//   // Helper method to invalidate post-related caches
//   async invalidatePostCaches(postId: string): Promise<void> {
//     const postKeys = [
//       `post:${postId}`,
//       `post:comments:${postId}`,
//       `post:likes:${postId}`,
//       `post:shares:${postId}`,
//     ];

//     try {
//       const deletedCount = await this.redis.del(...postKeys);
//       console.log(
//         `[CacheSubscriber] Deleted ${deletedCount} post cache keys for post: ${postId}`,
//       );
//     } catch (error) {
//       console.error('[CacheSubscriber] Error invalidating post caches:', error);
//     }
//   }
// }
