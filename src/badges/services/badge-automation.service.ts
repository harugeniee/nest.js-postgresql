import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BadgeEntityType, BadgeType } from 'src/shared/constants';
import { Repository } from 'typeorm';
import { BadgesService } from '../badges.service';
import { BadgeAssignment } from '../entities/badge-assignment.entity';

/**
 * Service for automated badge assignment based on various criteria
 * Handles automatic badge assignment logic similar to Discord's system
 */
@Injectable()
export class BadgeAutomationService {
  private readonly logger = new Logger(BadgeAutomationService.name);

  constructor(
    @InjectRepository(BadgeAssignment)
    private readonly badgeAssignmentRepository: Repository<BadgeAssignment>,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Check and assign badges based on user activity
   */
  async checkUserActivityBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking activity badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for content creator badge
    await this.checkContentCreatorBadge(userId, assignedBadges);

    // Check for verified user badge
    await this.checkVerifiedUserBadge(userId, assignedBadges);

    // Check for premium user badge
    await this.checkPremiumUserBadge(userId, assignedBadges);

    // Check for early adopter badge
    await this.checkEarlyAdopterBadge(userId, assignedBadges);

    // Check for beta tester badge
    await this.checkBetaTesterBadge(userId, assignedBadges);

    // Check for contributor badge
    await this.checkContributorBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} activity badges to user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on article activity
   */
  async checkArticleBadges(
    articleId: string,
    authorId: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking article badges for article: ${articleId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for article author badge
    await this.checkArticleAuthorBadge(authorId, assignedBadges);

    // Check for content creator badge based on article popularity
    await this.checkContentCreatorBadgeFromArticle(
      authorId,
      articleId,
      assignedBadges,
    );

    this.logger.log(
      `Assigned ${assignedBadges.length} article badges for article: ${articleId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on organization activity
   */
  async checkOrganizationBadges(
    organizationId: string,
    userId: string,
    role: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(
      `Checking organization badges for user: ${userId} in organization: ${organizationId}`,
    );

    const assignedBadges: BadgeAssignment[] = [];

    // Check for organization member badge
    await this.checkOrganizationMemberBadge(userId, assignedBadges);

    // Check for organization admin badge
    if (role === 'admin') {
      await this.checkOrganizationAdminBadge(userId, assignedBadges);
    }

    // Check for organization owner badge
    if (role === 'owner') {
      await this.checkOrganizationOwnerBadge(userId, assignedBadges);
    }

    this.logger.log(
      `Assigned ${assignedBadges.length} organization badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on comment activity
   */
  async checkCommentBadges(
    commentId: string,
    authorId: string,
  ): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking comment badges for comment: ${commentId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for comment moderator badge
    await this.checkCommentModeratorBadge(authorId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} comment badges for comment: ${commentId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on reaction activity
   */
  async checkReactionBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking reaction badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for reaction leader badge
    await this.checkReactionLeaderBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} reaction badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on share activity
   */
  async checkShareBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking share badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for share champion badge
    await this.checkShareChampionBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} share badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on bookmark activity
   */
  async checkBookmarkBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking bookmark badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for bookmark collector badge
    await this.checkBookmarkCollectorBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} bookmark badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on follow activity
   */
  async checkFollowBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking follow badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for follow influencer badge
    await this.checkFollowInfluencerBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} follow badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on notification activity
   */
  async checkNotificationBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking notification badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for notification master badge
    await this.checkNotificationMasterBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} notification badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on QR code activity
   */
  async checkQRBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking QR badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for QR code expert badge
    await this.checkQRCodeExpertBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} QR badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on sticker activity
   */
  async checkStickerBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking sticker badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for sticker creator badge
    await this.checkStickerCreatorBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} sticker badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on tag activity
   */
  async checkTagBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking tag badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for tag master badge
    await this.checkTagMasterBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} tag badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on report activity
   */
  async checkReportBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking report badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for report responder badge
    await this.checkReportResponderBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} report badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on analytics activity
   */
  async checkAnalyticsBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking analytics badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for analytics expert badge
    await this.checkAnalyticsExpertBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} analytics badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  /**
   * Check and assign badges based on worker activity
   */
  async checkWorkerBadges(userId: string): Promise<BadgeAssignment[]> {
    this.logger.log(`Checking worker badges for user: ${userId}`);

    const assignedBadges: BadgeAssignment[] = [];

    // Check for worker contributor badge
    await this.checkWorkerContributorBadge(userId, assignedBadges);

    this.logger.log(
      `Assigned ${assignedBadges.length} worker badges for user: ${userId}`,
    );
    return assignedBadges;
  }

  // Private helper methods for specific badge checks

  private async checkContentCreatorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for content creator badge logic
    // This would check user's content creation activity
  }

  private async checkVerifiedUserBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for verified user badge logic
    // This would check user's verification status
  }

  private async checkPremiumUserBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for premium user badge logic
    // This would check user's premium subscription status
  }

  private async checkEarlyAdopterBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for early adopter badge logic
    // This would check user's registration date
  }

  private async checkBetaTesterBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for beta tester badge logic
    // This would check user's beta testing participation
  }

  private async checkContributorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for contributor badge logic
    // This would check user's contribution activity
  }

  private async checkArticleAuthorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for article author badge logic
    // This would check user's article publishing activity
  }

  private async checkContentCreatorBadgeFromArticle(
    userId: string,
    articleId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for content creator badge based on article popularity
  }

  private async checkOrganizationMemberBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for organization member badge logic
  }

  private async checkOrganizationAdminBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for organization admin badge logic
  }

  private async checkOrganizationOwnerBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for organization owner badge logic
  }

  private async checkCommentModeratorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for comment moderator badge logic
  }

  private async checkReactionLeaderBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for reaction leader badge logic
  }

  private async checkShareChampionBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for share champion badge logic
  }

  private async checkBookmarkCollectorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for bookmark collector badge logic
  }

  private async checkFollowInfluencerBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for follow influencer badge logic
  }

  private async checkNotificationMasterBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for notification master badge logic
  }

  private async checkQRCodeExpertBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for QR code expert badge logic
  }

  private async checkStickerCreatorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for sticker creator badge logic
  }

  private async checkTagMasterBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for tag master badge logic
  }

  private async checkReportResponderBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for report responder badge logic
  }

  private async checkAnalyticsExpertBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for analytics expert badge logic
  }

  private async checkWorkerContributorBadge(
    userId: string,
    assignedBadges: BadgeAssignment[],
  ): Promise<void> {
    // Implementation for worker contributor badge logic
  }

  /**
   * Assign a badge if not already assigned
   */
  private async assignBadgeIfNotExists(
    userId: string,
    badgeType: BadgeType,
    assignedBadges: BadgeAssignment[],
    reason?: string,
  ): Promise<void> {
    const hasBadge = await this.badgesService.hasBadge(
      BadgeEntityType.USER,
      userId,
      badgeType,
    );
    if (!hasBadge) {
      try {
        const badge = await this.badgesService.getBadgeByType(badgeType);
        if (badge && badge.canBeAssigned()) {
          const assignment = await this.badgesService.assignBadge({
            badgeId: badge.id,
            entityType: BadgeEntityType.USER,
            entityId: userId,
            assignmentReason: reason,
          });
          assignedBadges.push(assignment);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to assign badge ${badgeType} to user ${userId}: ${error.message}`,
        );
      }
    }
  }
}
