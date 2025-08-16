import * as firebase from 'firebase-admin';

import { auth, messaging } from 'firebase-admin';

import { Injectable, Logger } from '@nestjs/common';

import { firebaseConfig } from './firebase.config';

// Firebase service account configuration
const firebaseParams = {
  type: firebaseConfig.type,
  projectId: firebaseConfig.project_id,
  privateKeyId: firebaseConfig.private_key_id,
  privateKey: firebaseConfig.private_key,
  clientEmail: firebaseConfig.client_email,
  clientId: firebaseConfig.client_id,
  authUri: firebaseConfig.auth_uri,
  tokenUri: firebaseConfig.token_uri,
  authProviderX509CertUrl: firebaseConfig.auth_provider_x509_cert_url,
  clientC509CertUrl: firebaseConfig.client_x509_cert_url,
};

// Type definitions for better type safety
interface FirebaseError {
  code?: string;
  message: string;
  stack?: string;
}

export interface FirebaseAuthResult {
  success: boolean;
  user?: auth.DecodedIdToken;
  error?: string;
}

export interface FirebaseMessagingResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TopicSubscriptionResult {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  errors?: unknown[];
  error?: string;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private readonly firebaseAdmin: firebase.app.App;
  private readonly auth: auth.Auth;
  private readonly messaging: messaging.Messaging;

  constructor() {
    // Initialize Firebase Admin SDK in constructor
    try {
      this.firebaseAdmin = firebase.initializeApp({
        credential: firebase.credential.cert(firebaseParams),
      });
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      // If app is already initialized, get the existing instance
      if (firebaseError.code === 'app/duplicate-app') {
        this.firebaseAdmin = firebase.app();
        this.logger.log(
          'Firebase Admin SDK already initialized, using existing instance',
        );
      } else {
        this.logger.error(
          'Failed to initialize Firebase Admin SDK',
          firebaseError.stack,
        );
        throw error;
      }
    }

    // Initialize Firebase services
    this.auth = this.firebaseAdmin.auth();
    this.messaging = this.firebaseAdmin.messaging();
    this.logger.log('Firebase services (Auth, Messaging) initialized');
  }

  /**
   * Authenticate a user using Firebase ID token
   * @param token - Firebase ID token to verify
   * @returns Promise<FirebaseAuthResult> - Authentication result with user data or error
   */
  public async authenticate(token: string): Promise<FirebaseAuthResult> {
    try {
      if (!token) {
        this.logger.warn('No token provided for authentication');
        return { success: false, error: 'No token provided' };
      }

      const decodedToken = await this.auth.verifyIdToken(token, true);

      this.logger.log(`User authenticated successfully: ${decodedToken.uid}`);
      return {
        success: true,
        user: decodedToken,
      };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      this.logger.error(
        `Firebase authentication failed: ${firebaseError.message}`,
        firebaseError.stack,
      );
      return {
        success: false,
        error: firebaseError.message,
      };
    }
  }

  /**
   * Send notification message to a specific topic
   * @param topic - Topic name to send message to
   * @param notification - Notification payload
   * @param data - Optional data payload
   * @returns Promise<FirebaseMessagingResult> - Messaging result
   */
  public async sendToTopic(
    topic: string,
    notification: messaging.Notification,
    data?: Record<string, string>,
  ): Promise<FirebaseMessagingResult> {
    try {
      if (!topic) {
        this.logger.warn('No topic provided for messaging');
        return { success: false, error: 'No topic provided' };
      }

      const message: messaging.Message = {
        notification,
        data,
        topic,
      };

      const response = await this.messaging.send(message);

      this.logger.log(
        `Message sent successfully to topic '${topic}': ${response}`,
      );
      return {
        success: true,
        messageId: response,
      };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      this.logger.error(
        `Failed to send message to topic '${topic}': ${firebaseError.message}`,
        firebaseError.stack,
      );
      return {
        success: false,
        error: firebaseError.message,
      };
    }
  }

  /**
   * Send notification message to specific device(s)
   * @param deviceTokens - Single device token or array of device tokens
   * @param payload - Message payload containing notification and/or data
   * @returns Promise<FirebaseMessagingResult> - Messaging result
   */
  public async sendToDevice(
    deviceTokens: string | string[],
    payload: messaging.MessagingPayload,
  ): Promise<FirebaseMessagingResult> {
    try {
      if (
        !deviceTokens ||
        (Array.isArray(deviceTokens) && deviceTokens.length === 0)
      ) {
        this.logger.warn('No device tokens provided for messaging');
        return { success: false, error: 'No device tokens provided' };
      }

      const tokens = Array.isArray(deviceTokens)
        ? deviceTokens
        : [deviceTokens];

      // Send to each device individually since sendToDevice is deprecated
      const results = await Promise.allSettled(
        tokens.map(token =>
          this.messaging.send({
            token,
            ...payload,
          }),
        ),
      );

      const successCount = results.filter(
        result => result.status === 'fulfilled',
      ).length;
      const failureCount = results.filter(
        result => result.status === 'rejected',
      ).length;

      this.logger.log(
        `Message sent to devices - Success: ${successCount}, Failed: ${failureCount}`,
      );

      if (failureCount > 0) {
        this.logger.warn(
          `Some messages failed to send. Check results for details`,
        );
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.logger.error(
              `Device ${tokens[index]} failed: ${result.reason}`,
            );
          }
        });
      }

      return {
        success: successCount > 0,
        messageId: successCount > 0 ? 'sent' : undefined,
        error:
          failureCount > 0
            ? `${failureCount} messages failed to send`
            : undefined,
      };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      this.logger.error(
        `Failed to send message to devices: ${firebaseError.message}`,
        firebaseError.stack,
      );
      return {
        success: false,
        error: firebaseError.message,
      };
    }
  }

  /**
   * Subscribe device tokens to a topic
   * @param deviceTokens - Single device token or array of device tokens
   * @param topicName - Topic name to subscribe to
   * @returns Promise<TopicSubscriptionResult> - Subscription result
   */
  public async subscribeToTopic(
    deviceTokens: string | string[],
    topicName: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      if (!topicName) {
        this.logger.warn('No topic name provided for subscription');
        return { success: false, error: 'No topic name provided' };
      }

      const tokens = Array.isArray(deviceTokens)
        ? deviceTokens
        : [deviceTokens];

      if (tokens.length === 0) {
        this.logger.warn('No device tokens provided for subscription');
        return { success: false, error: 'No device tokens provided' };
      }

      const response = await this.messaging.subscribeToTopic(tokens, topicName);

      this.logger.log(
        `Successfully subscribed ${response.successCount} devices to topic '${topicName}'`,
      );

      if (response.failureCount > 0) {
        this.logger.warn(
          `${response.failureCount} devices failed to subscribe to topic '${topicName}'`,
        );
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors,
      };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      this.logger.error(
        `Failed to subscribe devices to topic '${topicName}': ${firebaseError.message}`,
        firebaseError.stack,
      );
      return {
        success: false,
        error: firebaseError.message,
      };
    }
  }

  /**
   * Unsubscribe device tokens from a topic
   * @param deviceTokens - Array of device tokens to unsubscribe
   * @param topicName - Topic name to unsubscribe from
   * @returns Promise<TopicSubscriptionResult> - Unsubscription result
   */
  public async unsubscribeFromTopic(
    deviceTokens: string[],
    topicName: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      if (!topicName) {
        this.logger.warn('No topic name provided for unsubscription');
        return { success: false, error: 'No topic name provided' };
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        this.logger.warn('No device tokens provided for unsubscription');
        return { success: false, error: 'No device tokens provided' };
      }

      const response = await this.messaging.unsubscribeFromTopic(
        deviceTokens,
        topicName,
      );

      this.logger.log(
        `Successfully unsubscribed ${response.successCount} devices from topic '${topicName}'`,
      );

      if (response.failureCount > 0) {
        this.logger.warn(
          `${response.failureCount} devices failed to unsubscribe from topic '${topicName}'`,
        );
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors,
      };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      this.logger.error(
        `Failed to unsubscribe devices from topic '${topicName}': ${firebaseError.message}`,
        firebaseError.stack,
      );
      return {
        success: false,
        error: firebaseError.message,
      };
    }
  }

  /**
   * Get Firebase Admin app instance
   * @returns firebase.app.App - Firebase Admin app instance
   */
  public getApp(): firebase.app.App {
    return this.firebaseAdmin;
  }

  /**
   * Get Firebase Auth instance
   * @returns auth.Auth - Firebase Auth instance
   */
  public getAuth(): auth.Auth {
    return this.auth;
  }

  /**
   * Get Firebase Messaging instance
   * @returns messaging.Messaging - Firebase Messaging instance
   */
  public getMessaging(): messaging.Messaging {
    return this.messaging;
  }
}
