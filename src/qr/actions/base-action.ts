import { QrActionType } from '../qr.types';

/**
 * Context object passed to QR actions during execution
 * Contains all necessary information for the action to be performed
 */
export interface QrActionContext {
  /** The ticket ID this action is associated with */
  tid: string;
  /** User ID of the mobile user who approved the action */
  userId: string;
  /** Optional payload data specific to the action type */
  payload?: Record<string, any>;
  /** Optional web session ID that requested the action */
  webSessionId?: string;
  /** Timestamp when the action was approved */
  approvedAt: number;
}

/**
 * Abstract base class for all QR actions
 * Each action type must extend this class and implement the required methods
 */
export abstract class BaseQrAction {
  /**
   * Returns the action type this class handles
   * Must match one of the QrActionType enum values
   */
  abstract type(): QrActionType;

  /**
   * Executes the action with the given context
   * This method should contain the business logic for the specific action type
   *
   * @param ctx - The action context containing all necessary information
   * @returns Promise that resolves when the action is completed
   */
  abstract execute(ctx: QrActionContext): Promise<void>;

  /**
   * Validates the action context before execution
   * Override this method to add custom validation logic
   *
   * @param ctx - The action context to validate
   * @throws Error if validation fails
   */
  protected validateContext(ctx: QrActionContext): void {
    if (!ctx.tid) {
      throw new Error('Ticket ID is required');
    }
    if (!ctx.userId) {
      throw new Error('User ID is required');
    }
    if (!ctx.approvedAt) {
      throw new Error('Approval timestamp is required');
    }
  }

  /**
   * Pre-execution hook that runs before the main execute method
   * Override this method to add custom pre-execution logic
   *
   * @param ctx - The action context
   */
  protected async beforeExecute(ctx: QrActionContext): Promise<void> {
    // Default implementation does nothing
    // Override in subclasses to add custom logic
  }

  /**
   * Post-execution hook that runs after the main execute method
   * Override this method to add custom post-execution logic
   *
   * @param ctx - The action context
   */
  protected async afterExecute(ctx: QrActionContext): Promise<void> {
    // Default implementation does nothing
    // Override in subclasses to add custom logic
  }

  /**
   * Main execution method that orchestrates the action lifecycle
   * This method handles validation, pre-execution, execution, and post-execution
   *
   * @param ctx - The action context
   */
  async run(ctx: QrActionContext): Promise<void> {
    try {
      // Validate the context
      this.validateContext(ctx);

      // Run pre-execution hook
      await this.beforeExecute(ctx);

      // Execute the main action
      await this.execute(ctx);

      // Run post-execution hook
      await this.afterExecute(ctx);
    } catch (error) {
      // Log the error and re-throw
      console.error(
        `Error executing ${this.type()} action for ticket ${ctx.tid}:`,
        error,
      );
      throw error;
    }
  }
}
