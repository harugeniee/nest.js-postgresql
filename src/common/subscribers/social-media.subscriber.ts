// import { Injectable } from '@nestjs/common';
// import {
//   EntitySubscriberInterface,
//   InsertEvent,
//   UpdateEvent,
//   DataSource,
// } from 'typeorm';

// @Injectable()
// export class SocialMediaSubscriber implements EntitySubscriberInterface {
//   constructor(private dataSource: DataSource) {
//     this.dataSource.subscribers.push(this);
//   }

//   afterInsert(event: InsertEvent<any>) {
//     const entity = event.entity;
//     const entityName = entity.constructor.name;

//     switch (entityName) {
//       case 'Post':
//         this.handlePostCreated(entity);
//         break;
//       case 'Comment':
//         this.handleCommentCreated(entity);
//         break;
//       case 'Like':
//         this.handleLikeCreated(entity);
//         break;
//       case 'Follow':
//         this.handleFollowCreated(entity);
//         break;
//       case 'User':
//         this.handleUserCreated(entity);
//         break;
//     }
//   }

//   afterUpdate(event: UpdateEvent<any>) {
//     const entity = event.entity;
//     const entityName = entity.constructor.name;

//     switch (entityName) {
//       case 'Post':
//         this.handlePostUpdated(entity);
//         break;
//       case 'User':
//         this.handleUserUpdated(entity);
//         break;
//     }
//   }

//   private async handlePostCreated(post: any) {
//     console.log(`[SocialMediaSubscriber] New post created: ${post.id}`);

//     // TODO: Implement notification logic
//     // - Notify followers
//     // - Update trending algorithm
//     // - Send push notifications
//     // - Update user's post count

//     await this.notifyFollowers(post.authorId, 'new_post', {
//       postId: post.id,
//       authorName: post.authorName,
//       content: post.content.substring(0, 100) + '...',
//     });
//   }

//   private async handleCommentCreated(comment: any) {
//     console.log(`[SocialMediaSubscriber] New comment created: ${comment.id}`);

//     // TODO: Implement notification logic
//     // - Notify post author
//     // - Notify other commenters
//     // - Update comment count

//     await this.notifyUser(comment.postAuthorId, 'new_comment', {
//       commentId: comment.id,
//       postId: comment.postId,
//       commenterName: comment.authorName,
//       content: comment.content.substring(0, 50) + '...',
//     });
//   }

//   private async handleLikeCreated(like: any) {
//     console.log(`[SocialMediaSubscriber] New like created: ${like.id}`);

//     // TODO: Implement notification logic
//     // - Notify content owner
//     // - Update like count
//     // - Update trending score

//     await this.notifyUser(like.contentOwnerId, 'new_like', {
//       likeId: like.id,
//       contentType: like.contentType,
//       contentId: like.contentId,
//       likerName: like.userName,
//     });
//   }

//   private async handleFollowCreated(follow: any) {
//     console.log(`[SocialMediaSubscriber] New follow created: ${follow.id}`);

//     // TODO: Implement notification logic
//     // - Notify followed user
//     // - Update follower/following counts
//     // - Send welcome message

//     await this.notifyUser(follow.followedId, 'new_follower', {
//       followId: follow.id,
//       followerName: follow.followerName,
//       followerId: follow.followerId,
//     });
//   }

//   private async handleUserCreated(user: any) {
//     console.log(`[SocialMediaSubscriber] New user created: ${user.id}`);

//     // TODO: Implement welcome logic
//     // - Send welcome email
//     // - Create default profile
//     // - Suggest initial follows
//     // - Add to onboarding flow
//   }

//   private async handlePostUpdated(post: any) {
//     console.log(`[SocialMediaSubscriber] Post updated: ${post.id}`);

//     // TODO: Implement update logic
//     // - Update trending score
//     // - Notify if significant changes
//     // - Update search index
//   }

//   private async handleUserUpdated(user: any) {
//     console.log(`[SocialMediaSubscriber] User updated: ${user.id}`);

//     // TODO: Implement update logic
//     // - Update search index
//     // - Notify followers of profile changes
//     // - Update verification status
//   }

//   private async notifyFollowers(userId: string, type: string, data: any) {
//     // TODO: Implement follower notification
//     console.log(
//       `[SocialMediaSubscriber] Notifying followers of user ${userId} about ${type}`,
//     );
//   }

//   private async notifyUser(userId: string, type: string, data: any) {
//     // TODO: Implement user notification
//     console.log(
//       `[SocialMediaSubscriber] Notifying user ${userId} about ${type}`,
//     );
//   }
// }
