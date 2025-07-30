// import { Injectable } from '@nestjs/common';
// import {
//   EntitySubscriberInterface,
//   InsertEvent,
//   UpdateEvent,
//   DataSource,
// } from 'typeorm';

// @Injectable()
// export class ValidationSubscriber implements EntitySubscriberInterface {
//   constructor(private dataSource: DataSource) {
//     this.dataSource.subscribers.push(this);
//   }

//   beforeInsert(event: InsertEvent<any>) {
//     this.validateEntity(event.entity, 'INSERT');
//   }

//   beforeUpdate(event: UpdateEvent<any>) {
//     this.validateEntity(event.entity, 'UPDATE');
//   }

//   private validateEntity(entity: any, operation: string) {
//     const entityName = entity.constructor.name;
//     console.log(
//       `[ValidationSubscriber] Validating ${entityName} for ${operation}`,
//     );

//     switch (entityName) {
//       case 'User':
//         this.validateUser(entity);
//         break;
//       case 'Post':
//         this.validatePost(entity);
//         break;
//       case 'Comment':
//         this.validateComment(entity);
//         break;
//       case 'Like':
//         this.validateLike(entity);
//         break;
//       case 'Follow':
//         this.validateFollow(entity);
//         break;
//     }
//   }

//   private validateUser(user: any) {
//     // Username validation
//     if (user.username) {
//       if (user.username.length < 3) {
//         throw new Error('Username must be at least 3 characters long');
//       }
//       if (user.username.length > 30) {
//         throw new Error('Username must be less than 30 characters');
//       }
//       if (!/^[a-zA-Z0-9_]+$/.test(user.username)) {
//         throw new Error(
//           'Username can only contain letters, numbers, and underscores',
//         );
//       }
//     }

//     // Email validation
//     if (user.email) {
//       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!emailRegex.test(user.email)) {
//         throw new Error('Invalid email format');
//       }
//     }

//     // Password validation (if present)
//     if (user.password) {
//       if (user.password.length < 8) {
//         throw new Error('Password must be at least 8 characters long');
//       }
//       if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(user.password)) {
//         throw new Error(
//           'Password must contain at least one uppercase letter, one lowercase letter, and one number',
//         );
//       }
//     }

//     // Age validation
//     if (user.birthDate) {
//       const age = this.calculateAge(new Date(user.birthDate));
//       if (age < 13) {
//         throw new Error('User must be at least 13 years old');
//       }
//     }
//   }

//   private validatePost(post: any) {
//     // Content validation
//     if (post.content) {
//       if (post.content.length > 10000) {
//         throw new Error('Post content must be less than 10,000 characters');
//       }
//       if (post.content.trim().length === 0) {
//         throw new Error('Post content cannot be empty');
//       }
//     }

//     // Media validation
//     if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
//       if (post.mediaUrls.length > 10) {
//         throw new Error('Post cannot have more than 10 media files');
//       }

//       for (const url of post.mediaUrls) {
//         if (!this.isValidUrl(url)) {
//           throw new Error('Invalid media URL format');
//         }
//       }
//     }

//     // Hashtags validation
//     if (post.hashtags && Array.isArray(post.hashtags)) {
//       if (post.hashtags.length > 30) {
//         throw new Error('Post cannot have more than 30 hashtags');
//       }

//       for (const hashtag of post.hashtags) {
//         if (!/^#[a-zA-Z0-9_]+$/.test(hashtag)) {
//           throw new Error('Invalid hashtag format');
//         }
//       }
//     }
//   }

//   private validateComment(comment: any) {
//     // Content validation
//     if (comment.content) {
//       if (comment.content.length > 1000) {
//         throw new Error('Comment must be less than 1,000 characters');
//       }
//       if (comment.content.trim().length === 0) {
//         throw new Error('Comment content cannot be empty');
//       }
//     }

//     // Prevent self-reply spam
//     if (
//       comment.parentCommentId &&
//       comment.authorId === comment.parentAuthorId
//     ) {
//       throw new Error('Cannot reply to your own comment');
//     }
//   }

//   private validateLike(like: any) {
//     // Prevent duplicate likes
//     // This should be handled at database level with unique constraints
//     // but we can add additional validation here
//   }

//   private validateFollow(follow: any) {
//     // Prevent self-follow
//     if (follow.followerId === follow.followedId) {
//       throw new Error('Cannot follow yourself');
//     }
//   }

//   private calculateAge(birthDate: Date): number {
//     const today = new Date();
//     let age = today.getFullYear() - birthDate.getFullYear();
//     const monthDiff = today.getMonth() - birthDate.getMonth();

//     if (
//       monthDiff < 0 ||
//       (monthDiff === 0 && today.getDate() < birthDate.getDate())
//     ) {
//       age--;
//     }

//     return age;
//   }

//   private isValidUrl(url: string): boolean {
//     try {
//       new URL(url);
//       return true;
//     } catch {
//       return false;
//     }
//   }
// }
