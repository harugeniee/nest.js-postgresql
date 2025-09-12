/**
 * Slug utility functions for generating URL-friendly strings
 *
 * Features:
 * - Convert text to URL-friendly slugs
 * - Handle Vietnamese and international characters
 * - Generate unique slugs with collision detection
 * - Support for custom separators and length limits
 * - Preserve readability while ensuring uniqueness
 */

/**
 * Convert a string to a URL-friendly slug
 *
 * @param text - The text to convert to slug
 * @param options - Configuration options for slug generation
 * @returns URL-friendly slug string
 *
 * @example
 * ```typescript
 * createSlug('Hello World!') // 'hello-world'
 * createSlug('Xin chào thế giới!') // 'xin-chao-the-gioi'
 * createSlug('Article Title', { maxLength: 10 }) // 'article-ti'
 * ```
 */
export function createSlug(
  text: string,
  options: {
    maxLength?: number;
    separator?: string;
    preserveCase?: boolean;
  } = {},
): string {
  const { maxLength = 100, separator = '-', preserveCase = false } = options;

  if (!text || typeof text !== 'string') {
    return '';
  }

  // Step 1: Normalize Vietnamese and international characters
  let slug = normalizeVietnamese(text);

  // Step 2: Convert to lowercase if not preserving case
  if (!preserveCase) {
    slug = slug.toLowerCase();
  }

  // Step 3: Replace spaces and special characters with separator
  slug = slug
    .replace(/\W+/g, separator) // Replace non-word chars (includes spaces)
    .replace(
      new RegExp(
        `^${escapeRegExp(separator)}+|${escapeRegExp(separator)}+$`,
        'g',
      ),
      '',
    ) // Remove leading/trailing separators
    .replace(new RegExp(`${escapeRegExp(separator)}+`, 'g'), separator); // Replace multiple separators with single

  // Step 4: Truncate to max length while preserving word boundaries
  if (slug.length > maxLength) {
    const truncated = slug.substring(0, maxLength);
    const lastSeparatorIndex = truncated.lastIndexOf(separator);

    // If we can find a word boundary, cut there; otherwise cut at max length
    slug =
      lastSeparatorIndex > 0
        ? truncated.substring(0, lastSeparatorIndex)
        : truncated;
  }

  return slug;
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 *
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @param options - Configuration options
 * @returns Unique slug string
 *
 * @example
 * ```typescript
 * const existing = ['hello-world', 'hello-world-1'];
 * generateUniqueSlug('hello-world', existing) // 'hello-world-2'
 * generateUniqueSlug('new-article', existing) // 'new-article'
 * ```
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[] = [],
  options: {
    maxLength?: number;
    separator?: string;
  } = {},
): string {
  const { maxLength = 100, separator = '-' } = options;

  if (!baseSlug) {
    return '';
  }

  // Ensure base slug doesn't exceed max length
  let slug =
    baseSlug.length > maxLength ? baseSlug.substring(0, maxLength) : baseSlug;

  // Remove trailing separator if present
  slug = slug.replace(new RegExp(`${escapeRegExp(separator)}+$`), '');

  // Check if slug is unique
  if (!existingSlugs.includes(slug)) {
    return slug;
  }

  // Generate unique slug by appending number
  let counter = 1;
  let uniqueSlug = `${slug}${separator}${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${slug}${separator}${counter}`;
  }

  return uniqueSlug;
}

/**
 * Create a slug from article title with automatic uniqueness check
 *
 * @param title - Article title to convert to slug
 * @param existingSlugs - Array of existing slugs to avoid collisions
 * @param options - Configuration options
 * @returns Unique slug for the article
 *
 * @example
 * ```typescript
 * const existing = ['my-article', 'my-article-1'];
 * createArticleSlug('My New Article!', existing) // 'my-new-article'
 * createArticleSlug('My Article', existing) // 'my-article-2'
 * ```
 */
export function createArticleSlug(
  title: string,
  existingSlugs: string[] = [],
  options: {
    maxLength?: number;
    separator?: string;
  } = {},
): string {
  const { maxLength = 80, separator = '-' } = options; // Shorter max length for articles

  if (!title || typeof title !== 'string') {
    return '';
  }

  // Create base slug from title
  const baseSlug = createSlug(title, { maxLength, separator });

  // Generate unique slug
  return generateUniqueSlug(baseSlug, existingSlugs, { maxLength, separator });
}

/**
 * Validate if a string is a valid slug format
 *
 * @param slug - The slug to validate
 * @param options - Validation options
 * @returns True if slug is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidSlug('hello-world') // true
 * isValidSlug('hello world') // false
 * isValidSlug('hello--world') // false
 * isValidSlug('') // false
 * ```
 */
export function isValidSlug(
  slug: string,
  options: {
    minLength?: number;
    maxLength?: number;
    separator?: string;
    allowEmpty?: boolean;
  } = {},
): boolean {
  const {
    minLength = 1,
    maxLength = 100,
    separator = '-',
    allowEmpty = false,
  } = options;

  if (!slug || typeof slug !== 'string') {
    return allowEmpty;
  }

  // Check length constraints
  if (slug.length < minLength || slug.length > maxLength) {
    return false;
  }

  // Check for valid slug pattern (alphanumeric and separator only)
  const validSlugPattern = new RegExp(
    `^[a-z0-9]+(?:${escapeRegExp(separator)}[a-z0-9]+)*$`,
  );

  return validSlugPattern.test(slug);
}

/**
 * Normalize Vietnamese characters to ASCII equivalents
 *
 * @param text - Text containing Vietnamese characters
 * @returns Normalized text with Vietnamese characters converted to ASCII
 *
 * @example
 * ```typescript
 * normalizeVietnamese('Xin chào thế giới!') // 'Xin chao the gioi!'
 * normalizeVietnamese('Nguyễn Văn A') // 'Nguyen Van A'
 * ```
 */
function normalizeVietnamese(text: string): string {
  const vietnameseMap: Record<string, string> = {
    // Uppercase
    À: 'A',
    Á: 'A',
    Ạ: 'A',
    Ả: 'A',
    Ã: 'A',
    Â: 'A',
    Ầ: 'A',
    Ấ: 'A',
    Ậ: 'A',
    Ẩ: 'A',
    Ẫ: 'A',
    Ă: 'A',
    Ằ: 'A',
    Ắ: 'A',
    Ặ: 'A',
    Ẳ: 'A',
    Ẵ: 'A',
    È: 'E',
    É: 'E',
    Ẹ: 'E',
    Ẻ: 'E',
    Ẽ: 'E',
    Ê: 'E',
    Ề: 'E',
    Ế: 'E',
    Ệ: 'E',
    Ể: 'E',
    Ễ: 'E',
    Ì: 'I',
    Í: 'I',
    Ị: 'I',
    Ỉ: 'I',
    Ĩ: 'I',
    Ò: 'O',
    Ó: 'O',
    Ọ: 'O',
    Ỏ: 'O',
    Õ: 'O',
    Ô: 'O',
    Ồ: 'O',
    Ố: 'O',
    Ộ: 'O',
    Ổ: 'O',
    Ỗ: 'O',
    Ơ: 'O',
    Ờ: 'O',
    Ớ: 'O',
    Ợ: 'O',
    Ở: 'O',
    Ỡ: 'O',
    Ù: 'U',
    Ú: 'U',
    Ụ: 'U',
    Ủ: 'U',
    Ũ: 'U',
    Ư: 'U',
    Ừ: 'U',
    Ứ: 'U',
    Ự: 'U',
    Ử: 'U',
    Ữ: 'U',
    Ỳ: 'Y',
    Ý: 'Y',
    Ỵ: 'Y',
    Ỷ: 'Y',
    Ỹ: 'Y',
    Đ: 'D',

    // Lowercase
    à: 'a',
    á: 'a',
    ạ: 'a',
    ả: 'a',
    ã: 'a',
    â: 'a',
    ầ: 'a',
    ấ: 'a',
    ậ: 'a',
    ẩ: 'a',
    ẫ: 'a',
    ă: 'a',
    ằ: 'a',
    ắ: 'a',
    ặ: 'a',
    ẳ: 'a',
    ẵ: 'a',
    è: 'e',
    é: 'e',
    ẹ: 'e',
    ẻ: 'e',
    ẽ: 'e',
    ê: 'e',
    ề: 'e',
    ế: 'e',
    ệ: 'e',
    ể: 'e',
    ễ: 'e',
    ì: 'i',
    í: 'i',
    ị: 'i',
    ỉ: 'i',
    ĩ: 'i',
    ò: 'o',
    ó: 'o',
    ọ: 'o',
    ỏ: 'o',
    õ: 'o',
    ô: 'o',
    ồ: 'o',
    ố: 'o',
    ộ: 'o',
    ổ: 'o',
    ỗ: 'o',
    ơ: 'o',
    ờ: 'o',
    ớ: 'o',
    ợ: 'o',
    ở: 'o',
    ỡ: 'o',
    ù: 'u',
    ú: 'u',
    ụ: 'u',
    ủ: 'u',
    ũ: 'u',
    ư: 'u',
    ừ: 'u',
    ứ: 'u',
    ự: 'u',
    ử: 'u',
    ữ: 'u',
    ỳ: 'y',
    ý: 'y',
    ỵ: 'y',
    ỷ: 'y',
    ỹ: 'y',
    đ: 'd',
  };

  return text.replace(
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g,
    (char) => vietnameseMap[char] || char,
  );
}

/**
 * Escape special regex characters in a string
 *
 * @param string - String to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a slug with timestamp for unique identification
 * Useful for creating temporary or time-based slugs
 *
 * @param baseText - Base text to create slug from
 * @param options - Configuration options
 * @returns Slug with timestamp suffix
 *
 * @example
 * ```typescript
 * createTimestampedSlug('My Article') // 'my-article-20231201-143022'
 * ```
 */
export function createTimestampedSlug(
  baseText: string,
  options: {
    maxLength?: number;
    separator?: string;
    dateFormat?: 'YYYYMMDD-HHMMSS' | 'YYYYMMDD' | 'timestamp';
  } = {},
): string {
  const {
    maxLength = 100,
    separator = '-',
    dateFormat = 'YYYYMMDD-HHMMSS',
  } = options;

  const baseSlug = createSlug(baseText, {
    maxLength: maxLength - 20,
    separator,
  }); // Reserve space for timestamp

  const now = new Date();
  let timestamp: string;

  switch (dateFormat) {
    case 'YYYYMMDD':
      timestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
      break;
    case 'timestamp':
      timestamp = now.getTime().toString();
      break;
    case 'YYYYMMDD-HHMMSS':
    default:
      timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
      break;
  }

  return `${baseSlug}${separator}${timestamp}`;
}
