import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CharactersService } from 'src/characters/characters.service';
import type { Character } from 'src/characters/entities/character.entity';
import type { Segments } from 'src/series/entities/segments.entity';
import type { Series } from 'src/series/entities/series.entity';
import { SeriesService } from 'src/series/series.service';
import { SegmentsService } from 'src/series/services/segments.service';
import { CONTRIBUTION_CONSTANTS } from 'src/shared/constants/contribution.constants';
import type { Staff } from 'src/staffs/entities/staff.entity';
import { StaffsService } from 'src/staffs/staffs.service';
import type { DeepPartial } from 'typeorm';
import { ContributionsService } from '../contributions.service';
import { Contribution } from '../entities/contribution.entity';

/**
 * Contribution Processor Service
 *
 * Handles the business logic for approving and rejecting contributions.
 * Applies changes to target entities when contributions are approved.
 */
@Injectable()
export class ContributionProcessorService {
  private readonly logger = new Logger(ContributionProcessorService.name);

  constructor(
    private readonly contributionsService: ContributionsService,
    private readonly seriesService: SeriesService,
    private readonly segmentsService: SegmentsService,
    private readonly charactersService: CharactersService,
    private readonly staffsService: StaffsService,
  ) {}

  /**
   * Approve a contribution and apply changes to the target entity
   * @param contributionId - ID of the contribution to approve
   * @param reviewerId - ID of the admin reviewing the contribution
   * @param adminNotes - Optional notes from the admin
   * @returns Updated contribution entity
   */
  async approveContribution(
    contributionId: string,
    reviewerId: string,
    adminNotes?: string,
  ): Promise<Contribution> {
    // Get the contribution
    const contribution = await this.contributionsService.findById(
      contributionId,
      {
        relations: ['contributor'],
      },
    );

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Check if already reviewed
    if (contribution.status !== CONTRIBUTION_CONSTANTS.STATUS.PENDING) {
      throw new BadRequestException(
        `Contribution is already ${contribution.status}`,
      );
    }

    try {
      // Apply changes to target entity based on entity type and action
      let appliedEntityId: string | undefined;

      if (contribution.action === CONTRIBUTION_CONSTANTS.ACTION.CREATE) {
        appliedEntityId = await this.applyCreateAction(contribution);
      } else if (contribution.action === CONTRIBUTION_CONSTANTS.ACTION.UPDATE) {
        if (!contribution.entityId) {
          throw new BadRequestException(
            'Entity ID is required for update action',
          );
        }
        await this.applyUpdateAction(contribution);
        appliedEntityId = contribution.entityId;
      }

      // Update contribution status
      const updatedContribution = await this.contributionsService.update(
        contributionId,
        {
          status: CONTRIBUTION_CONSTANTS.STATUS.APPROVED,
          reviewerId,
          adminNotes,
          reviewedAt: new Date(),
        },
      );

      this.logger.log(
        `Contribution ${contributionId} approved by ${reviewerId}. Applied to entity ${appliedEntityId}`,
      );

      return updatedContribution;
    } catch (error) {
      this.logger.error(
        `Failed to approve contribution ${contributionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Reject a contribution
   * @param contributionId - ID of the contribution to reject
   * @param reviewerId - ID of the admin reviewing the contribution
   * @param rejectionReason - Reason for rejection (required)
   * @param adminNotes - Optional notes from the admin
   * @returns Updated contribution entity
   */
  async rejectContribution(
    contributionId: string,
    reviewerId: string,
    rejectionReason: string,
    adminNotes?: string,
  ): Promise<Contribution> {
    // Get the contribution
    const contribution =
      await this.contributionsService.findById(contributionId);

    if (!contribution) {
      throw new NotFoundException('Contribution not found');
    }

    // Check if already reviewed
    if (contribution.status !== CONTRIBUTION_CONSTANTS.STATUS.PENDING) {
      throw new BadRequestException(
        `Contribution is already ${contribution.status}`,
      );
    }

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Update contribution status
    const updatedContribution = await this.contributionsService.update(
      contributionId,
      {
        status: CONTRIBUTION_CONSTANTS.STATUS.REJECTED,
        reviewerId,
        rejectionReason,
        adminNotes,
        reviewedAt: new Date(),
      },
    );

    this.logger.log(`Contribution ${contributionId} rejected by ${reviewerId}`);

    return updatedContribution;
  }

  /**
   * Apply create action to target entity
   * @param contribution - Contribution entity
   * @returns ID of the created entity
   */
  private async applyCreateAction(contribution: Contribution): Promise<string> {
    const { entityType, proposedData } = contribution;

    switch (entityType) {
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SERIES: {
        const series = await this.seriesService.create(
          proposedData as DeepPartial<Series>,
        );
        return series.id;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SEGMENT: {
        const segment = await this.segmentsService.create(
          proposedData as DeepPartial<Segments>,
        );
        return segment.id;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.CHARACTER: {
        const character = await this.charactersService.create(
          proposedData as DeepPartial<Character>,
        );
        return character.id;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.STAFF: {
        const staff = await this.staffsService.create(
          proposedData as DeepPartial<Staff>,
        );
        return staff.id;
      }

      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  /**
   * Apply update action to target entity
   * @param contribution - Contribution entity
   */
  private async applyUpdateAction(contribution: Contribution): Promise<void> {
    const { entityType, entityId, proposedData } = contribution;

    if (!entityId) {
      throw new BadRequestException('Entity ID is required for update action');
    }

    // Verify entity exists before updating
    let entityExists = false;

    switch (entityType) {
      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SERIES: {
        const existingSeries = await this.seriesService.findById(entityId);
        if (!existingSeries) {
          throw new NotFoundException(`Series with ID ${entityId} not found`);
        }
        await this.seriesService.update(
          entityId,
          proposedData as DeepPartial<Series>,
        );
        entityExists = true;
        break;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.SEGMENT: {
        const existingSegment = await this.segmentsService.findById(entityId);
        if (!existingSegment) {
          throw new NotFoundException(`Segment with ID ${entityId} not found`);
        }
        await this.segmentsService.update(
          entityId,
          proposedData as DeepPartial<Segments>,
        );
        entityExists = true;
        break;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.CHARACTER: {
        const existingCharacter =
          await this.charactersService.findById(entityId);
        if (!existingCharacter) {
          throw new NotFoundException(
            `Character with ID ${entityId} not found`,
          );
        }
        await this.charactersService.update(
          entityId,
          proposedData as DeepPartial<Character>,
        );
        entityExists = true;
        break;
      }

      case CONTRIBUTION_CONSTANTS.ENTITY_TYPE.STAFF: {
        const existingStaff = await this.staffsService.findById(entityId);
        if (!existingStaff) {
          throw new NotFoundException(`Staff with ID ${entityId} not found`);
        }
        await this.staffsService.update(
          entityId,
          proposedData as DeepPartial<Staff>,
        );
        entityExists = true;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }

    if (!entityExists) {
      throw new NotFoundException(
        `${entityType} with ID ${entityId} not found`,
      );
    }
  }
}
