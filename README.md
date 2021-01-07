<h1 align="center">ts-mock-generator</h1>

English | [简体中文](./README-zh_CN.md)

## ✨ Features

- 📦 Mock generation tool out of the box
- 😛 Define the return value through the interface Interface automatically generates mock data
- 📄 Support generating mock files for secondary editing
- 🔥 Support file change monitoring (generated mock files, interface and request files)

## 📦 Installation

```bash
yarn add -D ts-mock-generator
```

```bash
npm install ts-mock-generator --save-dev
```

## 🔨 Example

```typescript
import { MockDataResolver } from 'ts-mock-generator';

const resolver = new MockDataResolver({
  basePath: path.join(process.cwd(), 'src', 'apis'),
  configPath: path.join(process.cwd(), 'tsconfig.json'),
  mockDir: path.join(process.cwd(), 'src', 'mock'),
  includes: [/^.*Service/],
});

// Obtain mock data
resolver.getOrGenerateData();

resolver.watchMockFile(() => {
  // When mock.json changes, callback will be triggered
});

resolver.watchRequestFile(() => {
  // When interface and service change, callback will be triggered
});
```

Note: If you need to use a plug-in to generate mock data, please meet the following two requirements:

- GET or POST accepts a generic return value, the first parameter of the method is url
- GET or POST calls a general request method, the second parameter of the general request method is the general backend return body type

Such as:

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

## ⚙️ Configuration items

-`basePath`: The root directory to be parsed, please provide an absolute path

-`configPath`: The directory where the `tsconfig.json` file is located, used for parsing by the compiler

-`mockDir`: The location of mock file generation. When set, mock.json and structure.json will be automatically generated

-`includes`: The class name rules to be parsed, you can set a regular expression or an array of regular expressions

-`excludes` and `includes` are mutually exclusive, meaning type rules not to be parsed, generally not used
