/**
 * Custom API error class used throughout the application.
 * Maps to the standard response envelope defined in Spec 02.
 *
 * Usage:
 *   throw new ApiError('ALLOCATION_CONFLICT', 409, 'Asset already held', { currentHolder });
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    public readonly description: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(description);
    this.name = 'ApiError';
  }
}

/**
 * Standard error codes used across the application.
 * Frontend should switch on these codes, not on message strings.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ALLOCATION_CONFLICT: 'ALLOCATION_CONFLICT',
  BOOKING_OVERLAP: 'BOOKING_OVERLAP',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  AUDIT_CYCLE_CLOSED: 'AUDIT_CYCLE_CLOSED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
