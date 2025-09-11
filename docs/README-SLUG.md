# Hướng dẫn sử dụng Slug Utility

## Tổng quan

Slug utility cung cấp các hàm helper để tạo ra các slug URL-friendly từ tiếng Việt và tiếng Anh. Slug là các chuỗi ký tự thân thiện với URL, thường được sử dụng trong các đường dẫn web.

## Các hàm chính

### 1. `createSlug(text, options)`
Tạo slug cơ bản từ một chuỗi văn bản.

```typescript
import { createSlug } from 'src/common/utils/slug.util';

// Ví dụ cơ bản
createSlug('Hello World!') // 'hello-world'
createSlug('Xin chào thế giới!') // 'xin-chao-the-gioi'

// Với tùy chọn
createSlug('Article Title', { 
  maxLength: 20, 
  separator: '_' 
}) // 'article_title'
```

### 2. `createArticleSlug(title, existingSlugs, options)`
Tạo slug cho bài viết với kiểm tra trùng lặp tự động.

```typescript
import { createArticleSlug } from 'src/common/utils/slug.util';

const existingSlugs = ['bai-viet-1', 'bai-viet-2'];
const slug = createArticleSlug('Bài viết mới', existingSlugs);
// Kết quả: 'bai-viet-moi' (nếu chưa tồn tại)
// Hoặc: 'bai-viet-moi-1' (nếu đã tồn tại)
```

### 3. `generateUniqueSlug(baseSlug, existingSlugs, options)`
Tạo slug duy nhất bằng cách thêm số thứ tự.

```typescript
import { generateUniqueSlug } from 'src/common/utils/slug.util';

const existingSlugs = ['hello-world', 'hello-world-1'];
const uniqueSlug = generateUniqueSlug('hello-world', existingSlugs);
// Kết quả: 'hello-world-2'
```

### 4. `isValidSlug(slug, options)`
Kiểm tra tính hợp lệ của slug.

```typescript
import { isValidSlug } from 'src/common/utils/slug.util';

isValidSlug('hello-world') // true
isValidSlug('hello world') // false (có khoảng trắng)
isValidSlug('hello--world') // false (có dấu gạch ngang kép)
```

### 5. `createTimestampedSlug(baseText, options)`
Tạo slug với timestamp để đảm bảo tính duy nhất.

```typescript
import { createTimestampedSlug } from 'src/common/utils/slug.util';

const slug = createTimestampedSlug('Draft Article');
// Kết quả: 'draft-article-20231201-143022'
```

## Sử dụng trong Article Service

### Tạo bài viết mới với slug tự động

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
    // Lấy danh sách slug hiện có
    const existingSlugs = await this.getExistingSlugs();
    
    // Tạo slug duy nhất
    const slug = createArticleSlug(articleData.title, existingSlugs);
    
    // Tạo bài viết
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

### Cập nhật tiêu đề và slug

```typescript
async updateArticleTitle(articleId: string, newTitle: string) {
  const article = await this.articleRepository.findOne({
    where: { id: articleId },
  });

  if (!article) {
    throw new Error('Bài viết không tồn tại');
  }

  // Tạo slug mới từ tiêu đề mới
  const existingSlugs = await this.getExistingSlugs(articleId);
  const newSlug = createArticleSlug(newTitle, existingSlugs);

  // Cập nhật bài viết
  article.title = newTitle;
  article.slug = newSlug;
  
  return await this.articleRepository.save(article);
}
```

### Kiểm tra slug tùy chỉnh

```typescript
async validateCustomSlug(slug: string, excludeArticleId?: string) {
  // Kiểm tra định dạng slug
  const isValid = isValidSlug(slug, { minLength: 3, maxLength: 80 });
  
  if (!isValid) {
    return {
      isValid: false,
      error: 'Định dạng slug không hợp lệ',
      suggestion: createSlug(slug, { maxLength: 80 }),
    };
  }

  // Kiểm tra slug có tồn tại không
  const existingArticle = await this.articleRepository.findOne({
    where: { slug },
  });

  if (existingArticle && existingArticle.id !== excludeArticleId) {
    return {
      isValid: false,
      error: 'Slug đã tồn tại',
      suggestion: generateUniqueSlug(slug, await this.getExistingSlugs(excludeArticleId)),
    };
  }

  return { isValid: true, slug };
}
```

## Tùy chọn cấu hình

### Options cho `createSlug`

```typescript
interface SlugOptions {
  maxLength?: number;      // Độ dài tối đa (mặc định: 100)
  separator?: string;      // Ký tự phân cách (mặc định: '-')
  preserveCase?: boolean;  // Giữ nguyên chữ hoa/thường (mặc định: false)
}
```

### Options cho `isValidSlug`

```typescript
interface ValidationOptions {
  minLength?: number;      // Độ dài tối thiểu (mặc định: 1)
  maxLength?: number;      // Độ dài tối đa (mặc định: 100)
  separator?: string;      // Ký tự phân cách (mặc định: '-')
  allowEmpty?: boolean;    // Cho phép chuỗi rỗng (mặc định: false)
}
```

## Xử lý tiếng Việt

Utility tự động xử lý các ký tự tiếng Việt:

- `à, á, ạ, ả, ã` → `a`
- `è, é, ẹ, ẻ, ẽ` → `e`
- `ì, í, ị, ỉ, ĩ` → `i`
- `ò, ó, ọ, ỏ, õ` → `o`
- `ù, ú, ụ, ủ, ũ` → `u`
- `ỳ, ý, ỵ, ỷ, ỹ` → `y`
- `đ` → `d`

## Ví dụ thực tế

```typescript
// Tiêu đề tiếng Việt
createSlug('Hướng dẫn lập trình NestJS cho người mới bắt đầu')
// Kết quả: 'huong-dan-lap-trinh-nestjs-cho-nguoi-moi-bat-dau'

// Tiêu đề có ký tự đặc biệt
createSlug('React & TypeScript: Best Practices 2024!')
// Kết quả: 'react-typescript-best-practices-2024'

// Tiêu đề dài với giới hạn độ dài
createSlug('Một bài viết rất dài về lập trình web hiện đại', { maxLength: 30 })
// Kết quả: 'mot-bai-viet-rat-dai-ve-lap'
```

## Lưu ý quan trọng

1. **Tính duy nhất**: Luôn kiểm tra slug trước khi lưu vào database
2. **Độ dài**: Giới hạn độ dài slug để tránh URL quá dài
3. **SEO**: Slug nên mô tả nội dung bài viết
4. **Tương thích**: Slug chỉ chứa ký tự an toàn cho URL
5. **Hiệu suất**: Index cột slug trong database để tìm kiếm nhanh
