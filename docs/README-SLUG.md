# Slug Utility Usage Guide

## Overview

Slug utility provides helper functions to create URL-friendly slugs from Vietnamese and English text. Slugs are URL-friendly character strings commonly used in web paths.

## Main Functions

### 1. `createSlug(text, options)`
Creates a basic slug from a text string.

```typescript
import { createSlug } from 'src/common/utils/slug.util';

// Basic examples
createSlug('Hello World!') // 'hello-world'
createSlug('Xin chào thế giới!') // 'xin-chao-the-gioi'

// With options
createSlug('Article Title', { 
  maxLength: 20, 
  separator: '_' 
}) // 'article_title'
```

### 2. `createArticleSlug(title, existingSlugs, options)`
Creates a slug for articles with automatic duplicate checking.

```typescript
import { createArticleSlug } from 'src/common/utils/slug.util';

const existingSlugs = ['bai-viet-1', 'bai-viet-2'];
const slug = createArticleSlug('Bài viết mới', existingSlugs);
// Result: 'bai-viet-moi' (if not exists)
// Or: 'bai-viet-moi-1' (if already exists)
```

### 3. `generateUniqueSlug(baseSlug, existingSlugs, options)`
Creates a unique slug by adding sequential numbers.

```typescript
import { generateUniqueSlug } from 'src/common/utils/slug.util';

const existingSlugs = ['hello-world', 'hello-world-1'];
const uniqueSlug = generateUniqueSlug('hello-world', existingSlugs);
// Result: 'hello-world-2'
```

### 4. `isValidSlug(slug, options)`
Validates slug format.

```typescript
import { isValidSlug } from 'src/common/utils/slug.util';

isValidSlug('hello-world') // true
isValidSlug('hello world') // false (contains spaces)
isValidSlug('hello--world') // false (contains double dashes)
```

### 5. `createTimestampedSlug(baseText, options)`
Creates a slug with timestamp to ensure uniqueness.

```typescript
import { createTimestampedSlug } from 'src/common/utils/slug.util';

const slug = createTimestampedSlug('Draft Article');
// Result: 'draft-article-20231201-143022'
```

## Usage in Article Service

### Creating new articles with automatic slug generation

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { createArticleSlug } from 'src/common/utils/slug.util';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
  ) {}

  async createArticle(articleData: {
    title: string;
    content: string;
    authorId: string;
  }) {
    // Get existing slugs
    const existingSlugs = await this.getExistingSlugs();
    
    // Create unique slug
    const slug = createArticleSlug(articleData.title, existingSlugs);
    
    // Create article
    const article = this.articleRepository.create({
      ...articleData,
      slug,
    });
    
    return await this.articleRepository.save(article);
  }

  private async getExistingSlugs(): Promise<string[]> {
    const articles = await this.articleRepository
      .createQueryBuilder('article')
      .select('article.slug')
      .where('article.deletedAt IS NULL')
      .getMany();
    
    return articles.map(article => article.slug);
  }
}
```

### Updating title and slug

```typescript
async updateArticleTitle(articleId: string, newTitle: string) {
  const article = await this.articleRepository.findOne({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error('Article not found');
  }

  // Create new slug from new title
  const existingSlugs = await this.getExistingSlugs(articleId);
  const newSlug = createArticleSlug(newTitle, existingSlugs);

  // Update article
  article.title = newTitle;
  article.slug = newSlug;
  
  return await this.articleRepository.save(article);
}
```

### Validating custom slug

```typescript
async validateCustomSlug(slug: string, excludeArticleId?: string) {
  // Check slug format
  const isValid = isValidSlug(slug, { minLength: 3, maxLength: 80 });
  
  if (!isValid) {
    return {
      isValid: false,
      error: 'Invalid slug format',
      suggestion: createSlug(slug, { maxLength: 80 }),
    };
  }

  // Check if slug already exists
  const existingArticle = await this.articleRepository.findOne({
    where: { slug },
  });

  if (existingArticle && existingArticle.id !== excludeArticleId) {
    return {
      isValid: false,
      error: 'Slug already exists',
      suggestion: generateUniqueSlug(slug, await this.getExistingSlugs(excludeArticleId)),
    };
  }

  return { isValid: true, slug };
}
```

## Configuration Options

### Options for `createSlug`

```typescript
interface SlugOptions {
  maxLength?: number;      // Maximum length (default: 100)
  separator?: string;      // Separator character (default: '-')
  preserveCase?: boolean;  // Preserve case (default: false)
}
```

### Options for `isValidSlug`

```typescript
interface ValidationOptions {
  minLength?: number;      // Minimum length (default: 1)
  maxLength?: number;      // Maximum length (default: 100)
  separator?: string;      // Separator character (default: '-')
  allowEmpty?: boolean;    // Allow empty string (default: false)
}
```

## Vietnamese Text Processing

The utility automatically handles Vietnamese characters:

- `à, á, ạ, ả, ã` → `a`
- `è, é, ẹ, ẻ, ẽ` → `e`
- `ì, í, ị, ỉ, ĩ` → `i`
- `ò, ó, ọ, ỏ, õ` → `o`
- `ù, ú, ụ, ủ, ũ` → `u`
- `ỳ, ý, ỵ, ỷ, ỹ` → `y`
- `đ` → `d`

## Real-world Examples

```typescript
// Vietnamese title
createSlug('Hướng dẫn lập trình NestJS cho người mới bắt đầu')
// Result: 'huong-dan-lap-trinh-nestjs-cho-nguoi-moi-bat-dau'

// Title with special characters
createSlug('React & TypeScript: Best Practices 2024!')
// Result: 'react-typescript-best-practices-2024'

// Long title with length limit
createSlug('Một bài viết rất dài về lập trình web hiện đại', { maxLength: 30 })
// Result: 'mot-bai-viet-rat-dai-ve-lap'
```

## Important Notes

1. **Uniqueness**: Always check slug before saving to database
2. **Length**: Limit slug length to avoid overly long URLs
3. **SEO**: Slug should describe article content
4. **Compatibility**: Slug should only contain URL-safe characters
5. **Performance**: Index slug column in database for fast searching
