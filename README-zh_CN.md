<h1 align="center">ts-mock-generator</h1>

[English](./README.md) | 简体中文

## ✨ 特性

- 📦 开箱即用的 Mock 生成工具
- 😛 通过接口定义返回值 Interface 自动生成 Mock 数据
- 📄 支持生成 Mock 文件，用于二次编辑
- 🔥 支持文件变更监听（生成的 mock 文件、interface 以及 request 文件）

## 📦 安装

```bash
yarn add -D ts-mock-generator
```

```bash
npm install ts-mock-generator --save-dev
```

## 🔨 示例

```typescript
import { MockDataResolver } from 'ts-mock-generator';

const resolver = new MockDataResolver({
  basePath: path.join(process.cwd(), 'src', 'apis'),
  configPath: path.join(process.cwd(), 'tsconfig.json'),
  mockDir: path.join(process.cwd(), 'src', 'mock'),
  includes: [/^.*Service/],
});

// 获得mock数据
resolver.getOrGenerateData();

resolver.watchMockFile(() => {
  // 当mock.json发生改变时，会触发回调
});

resolver.watchRequestFile(() => {
  // 当interface、service发生变化时，会触发回调
});
```

注意：若需要使用插件生成 Mock 数据，请满足以下两点要求：

- GET 或 POST 接受一个泛型表示返回值，方法第一个参数为 url
- GET 或 POST 调用一个通用请求方法，该通用请求方法的第二个参数为通用后端返回体类型

如：

```typescript
class Request {
  get<T>(url: string, opts?: Record<string, any>) {
    return this.fetch<T>({
      method: 'get',
      url: `${url}?_t=${Date.now()}`,
      ...opts,
    });
  }

  post<T>(url: string, opts?: Record<string, any>) {
    return this.fetch<T>({
      method: 'post',
      url,
      ...opts,
    });
  }

  fetch<T, R = ResponseData<T>>(opts: Record<string, any>) {
    return new Promise<T>((resolve) => {
      resolve({} as T);
    });
  }
}

export default new Request();
```

## ⚙️ 配置项

- `basePath`：要解析的根目录，请提供绝对路径

- `configPath`： `tsconfig.json`文件所在的目录，用于 compiler 解析时使用

- `mockDir`： mock 文件生成位置，当设置时，会自动生成 mock.json 以及 structure.json

- `includes`：要解析的类名规则，可以设置一个正则表达式或者一个正则表达式数组

- `excludes` 与 `includes` 互斥，表示不要解析的类型规则，一般用不到
