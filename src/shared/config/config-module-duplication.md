# ConfigModule Duplication Issue

## Vấn đề

ConfigModule được khởi tạo 2 lần trong logs:
```
[Nest] 95338  - 07/30/2025, 5:37:55 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
[Nest] 95338  - 07/30/2025, 5:37:55 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
```

## Nguyên nhân

### ❌ **Code trước khi sửa (Có vấn đề)**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      isGlobal: true, // Đã khai báo global
      envFilePath: '.env',
      expandVariables: true,
      cache: true,
      load: [...],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // ❌ Import lại ConfigModule không cần thiết
      useClass: DatabaseConfigFactory,
    }),
    // ...
  ],
})
export class AppModule {}
```

### ✅ **Code sau khi sửa (Đã khắc phục)**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      isGlobal: true, // Global module
      envFilePath: '.env',
      expandVariables: true,
      cache: true,
      load: [...],
    }),
    TypeOrmModule.forRootAsync({
      // ✅ Không cần imports: [ConfigModule] vì đã global
      useClass: DatabaseConfigFactory,
    }),
    // ...
  ],
})
export class AppModule {}
```

## Giải thích

### 1. **Global Module**
Khi `ConfigModule` được khai báo với `isGlobal: true`, nó sẽ:
- Được khởi tạo một lần duy nhất
- Tự động available trong tất cả modules khác
- Không cần import lại trong các modules con

### 2. **forRootAsync Pattern**
Khi sử dụng `forRootAsync()`, bạn chỉ cần import `ConfigModule` nếu:
- Module đó KHÔNG phải global
- Bạn cần inject `ConfigService` trong factory function

### 3. **Dependency Injection**
Trong `DatabaseConfigFactory`, `ConfigService` vẫn được inject bình thường:
```typescript
@Injectable()
export class DatabaseConfigFactory implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {} // ✅ Vẫn hoạt động
  // ...
}
```

## Best Practices

### 1. **Global ConfigModule**
```typescript
ConfigModule.forRoot({
  isGlobal: true, // Khai báo global
  // ...
})
```

### 2. **Async Module Configuration**
```typescript
// ✅ Đúng - Không cần import ConfigModule
TypeOrmModule.forRootAsync({
  useClass: DatabaseConfigFactory,
})

// ❌ Sai - Import không cần thiết
TypeOrmModule.forRootAsync({
  imports: [ConfigModule], // Không cần thiết
  useClass: DatabaseConfigFactory,
})
```

### 3. **Factory Pattern**
```typescript
// ✅ Đúng - Sử dụng factory function
RedisModule.forRootAsync({
  inject: [ConfigService], // Inject ConfigService
  useFactory: (configService: ConfigService) => ({
    // ...
  }),
})

// ✅ Đúng - Sử dụng factory class
TypeOrmModule.forRootAsync({
  useClass: DatabaseConfigFactory, // Factory class
})
```

## Lợi ích của việc sửa

### 1. **Performance**
- Giảm thời gian khởi tạo ứng dụng
- Giảm memory usage
- Tránh duplicate module instances

### 2. **Maintainability**
- Code sạch hơn
- Dễ hiểu hơn
- Ít lỗi hơn

### 3. **Consistency**
- Tuân theo NestJS best practices
- Nhất quán với global module pattern

## Kiểm tra

Sau khi sửa, logs sẽ chỉ hiển thị một lần:
```
[Nest] 95338  - 07/30/2025, 5:37:55 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +0ms
```

## Lưu ý

- Luôn kiểm tra `isGlobal: true` khi sử dụng ConfigModule
- Không import global modules trong `forRootAsync()`
- Sử dụng `inject: [ConfigService]` thay vì `imports: [ConfigModule]` 