// utils/errorCodes.ts
export const ERROR_CODES = {
    NETWORK_ERROR: {
      code: 'E100',
      defaultMessage: 'Network connection failed',
    },
    AUTH_FAILED: {
      code: 'E101',
      defaultMessage: 'Authentication failed',
    },
    ROOM_FULL: {
      code: 'R102',
      defaultMessage: 'The room is already full',
    },
    MIC_NOT_ALLOWED: {
      code: 'R103',
      defaultMessage: 'Microphone access denied',
    },
    ROOM_BANNED: {
        code: 'R104', // Updated to avoid duplicate code
        defaultMessage: 'The host banned you from this room',
      },
    ROOM_NOT_AUTHORIZED: {
        code: 'R105',
        defaultMessage: 'You are no authority to operate',
        },
    ROOM_INVALID_ACTION: {
      code: 'R106',
      defaultMessage: 'Invalid action',
    }
    // Add more as needed
  };
