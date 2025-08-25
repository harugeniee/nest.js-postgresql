import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BaseQrAction, QrActionContext } from './actions';
import { AddFriendAction } from './actions/add-friend.action';
import { JoinOrgAction } from './actions/join-org.action';
import { LoginAction } from './actions/login.action';
import { PairAction } from './actions/pair.action';
import { QrActionType } from 'src/shared/constants';

/**
 * QR Action Executor Service
 *
 * This service is responsible for routing QR actions to the appropriate
 * action implementation classes. It acts as a central coordinator for
 * all QR-related actions and ensures proper execution flow.
 *
 * The service maintains a registry of all available actions and provides
 * a unified interface for executing them.
 */
@Injectable()
export class QrActionExecutorService {
  private readonly logger = new Logger(QrActionExecutorService.name);
  private readonly actions: Map<QrActionType, BaseQrAction>;

  constructor(
    private readonly loginAction: LoginAction,
    private readonly addFriendAction: AddFriendAction,
    private readonly joinOrgAction: JoinOrgAction,
    private readonly pairAction: PairAction,
  ) {
    // Initialize the action registry
    this.actions = new Map<QrActionType, BaseQrAction>([
      [QrActionType.LOGIN, this.loginAction],
      [QrActionType.ADD_FRIEND, this.addFriendAction],
      [QrActionType.JOIN_ORG, this.joinOrgAction],
      [QrActionType.PAIR, this.pairAction],
    ]);

    this.logger.log(
      'QR Action Executor Service initialized with all action types',
    );
  }

  /**
   * Executes a QR action based on the action type
   *
   * @param actionType - The type of action to execute
   * @param context - The context object containing all necessary information
   * @returns Promise that resolves when the action is completed
   * @throws NotFoundException if the action type is not supported
   * @throws Error if the action execution fails
   */
  async execute(
    actionType: QrActionType,
    context: QrActionContext,
  ): Promise<void> {
    this.logger.debug(
      `Executing ${actionType} action for ticket ${context.tid}`,
    );

    // Find the appropriate action implementation
    const action = this.actions.get(actionType);
    if (!action) {
      this.logger.error(`Action type ${actionType} is not supported`);
      throw new NotFoundException(`Action type ${actionType} is not supported`);
    }

    try {
      // Execute the action using the base class run method
      // This ensures proper lifecycle management (validation, pre-execution, execution, post-execution)
      await action.run(context);

      this.logger.log(
        `Successfully executed ${actionType} action for ticket ${context.tid}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to execute ${actionType} action for ticket ${context.tid}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Gets all supported action types
   *
   * @returns Array of supported action types
   */
  getSupportedActionTypes(): QrActionType[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Checks if an action type is supported
   *
   * @param actionType - The action type to check
   * @returns True if the action type is supported, false otherwise
   */
  isActionTypeSupported(actionType: QrActionType): boolean {
    return this.actions.has(actionType);
  }

  /**
   * Gets the action implementation for a specific action type
   *
   * @param actionType - The action type to get
   * @returns The action implementation or undefined if not found
   */
  getAction(actionType: QrActionType): BaseQrAction | undefined {
    return this.actions.get(actionType);
  }

  /**
   * Gets information about all registered actions
   *
   * @returns Object containing action type to class name mappings
   */
  getActionInfo(): Record<QrActionType, string> {
    const info: Record<QrActionType, string> = {} as Record<
      QrActionType,
      string
    >;

    for (const [actionType, action] of this.actions.entries()) {
      info[actionType] = action.constructor.name;
    }

    return info;
  }

  /**
   * Validates that all required actions are properly registered
   * This method can be called during service initialization to ensure
   * the service is properly configured
   *
   * @returns True if all actions are properly registered
   * @throws Error if any required actions are missing
   */
  validateActionRegistry(): boolean {
    const requiredActions = Object.values(QrActionType);
    const missingActions = requiredActions.filter(
      (actionType) => !this.actions.has(actionType),
    );

    if (missingActions.length > 0) {
      const error = `Missing action implementations: ${missingActions.join(', ')}`;
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.log('All required actions are properly registered');
    return true;
  }
}
