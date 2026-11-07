import crypto from 'crypto';

/**
 * Generate a unique, readable booking reference code
 * Format: BK-<5 RANDOM ALPHANUMERIC CHARS> (e.g. BK-89421)
 */
export const generateBookingReference = () => {
  const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous chars (0, O, 1, I)
  let result = 'BK-';
  const randomBytes = crypto.randomBytes(5);

  for (let i = 0; i < 5; i++) {
    result += characters[randomBytes[i] % characters.length];
  }

  return result;
};

