const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JOIN_CODE_REGEX = /^[A-Z0-9]{6}$/;

export const MAX_ALBUM_NAME_LENGTH = 80;
export const MAX_PHOTO_TITLE_LENGTH = 120;
export const MAX_DOWNLOAD_PHOTO_COUNT = 200;
export const MAX_DOWNLOAD_TOTAL_BYTES = 250 * 1024 * 1024;
export const MIN_USER_NAME_LENGTH = 2;
export const MAX_USER_NAME_LENGTH = 80;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PARTY_NAME_LENGTH = 2;
export const MAX_PARTY_NAME_LENGTH = 100;
export const MAX_PARTY_DESCRIPTION_LENGTH = 500;

interface ValidationResult<T> {
  value: T | null;
  error: string | null;
}

/** Returns true when value is a canonical UUID string. */
export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

/** Validates album names with trimming and max length constraints. */
export function validateAlbumName(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (!value) {
    return { value: null, error: "Album name is required." };
  }

  if (value.length > MAX_ALBUM_NAME_LENGTH) {
    return {
      value: null,
      error: `Album name is too long. Maximum ${MAX_ALBUM_NAME_LENGTH} characters allowed.`,
    };
  }

  return { value, error: null };
}

/** Validates optional photo title and normalizes empty values to null. */
export function validateOptionalPhotoTitle(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (!value) {
    return { value: null, error: null };
  }

  if (value.length > MAX_PHOTO_TITLE_LENGTH) {
    return {
      value: null,
      error: `Photo title is too long. Maximum ${MAX_PHOTO_TITLE_LENGTH} characters allowed.`,
    };
  }

  return { value, error: null };
}

/** Validates user name with minimum and maximum length constraints. */
export function validateUserName(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (value.length < MIN_USER_NAME_LENGTH) {
    return {
      value: null,
      error: `Name must be at least ${MIN_USER_NAME_LENGTH} characters.`,
    };
  }

  if (value.length > MAX_USER_NAME_LENGTH) {
    return {
      value: null,
      error: `Name is too long. Maximum ${MAX_USER_NAME_LENGTH} characters allowed.`,
    };
  }

  return { value, error: null };
}

/** Validates and normalizes an email to lowercase. */
export function validateEmail(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim().toLowerCase() : "";

  if (!value) {
    return { value: null, error: "Email is required." };
  }

  if (value.length > MAX_EMAIL_LENGTH) {
    return {
      value: null,
      error: `Email is too long. Maximum ${MAX_EMAIL_LENGTH} characters allowed.`,
    };
  }

  if (!EMAIL_REGEX.test(value)) {
    return { value: null, error: "Please provide a valid email address." };
  }

  return { value, error: null };
}

/** Validates optional email input and normalizes empty values to null. */
export function validateOptionalEmail(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (!value) {
    return { value: null, error: null };
  }

  return validateEmail(value);
}

/** Validates party names. */
export function validatePartyName(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (value.length < MIN_PARTY_NAME_LENGTH) {
    return {
      value: null,
      error: `Party name must be at least ${MIN_PARTY_NAME_LENGTH} characters.`,
    };
  }

  if (value.length > MAX_PARTY_NAME_LENGTH) {
    return {
      value: null,
      error: `Party name is too long. Maximum ${MAX_PARTY_NAME_LENGTH} characters allowed.`,
    };
  }

  return { value, error: null };
}

/** Validates an optional party description. */
export function validateOptionalPartyDescription(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim() : "";

  if (!value) {
    return { value: null, error: null };
  }

  if (value.length > MAX_PARTY_DESCRIPTION_LENGTH) {
    return {
      value: null,
      error: `Description is too long. Maximum ${MAX_PARTY_DESCRIPTION_LENGTH} characters allowed.`,
    };
  }

  return { value, error: null };
}

/** Validates 6-character uppercase alphanumeric join code. */
export function validateJoinCode(input: unknown): ValidationResult<string> {
  const value = typeof input === "string" ? input.trim().toUpperCase() : "";

  if (!JOIN_CODE_REGEX.test(value)) {
    return {
      value: null,
      error: "Join code must be 6 uppercase letters or numbers.",
    };
  }

  return { value, error: null };
}
