import ts from 'typescript';
import { logger } from '../utils';

declare type TsConfig = {
  compilerOptions: any;
};

interface ITsConfigResolver {
  getCompilerOptions(): ts.CompilerOptions;
  getConfig(): TsConfig;
  getCompilerOptionsFromConfig(config: TsConfig): ts.CompilerOptions;
}

export class TsConfigResolver implements ITsConfigResolver {
  private path: string;
  private compilerOptions: ts.CompilerOptions;

  constructor(path: string) {
    this.path = path;
    const config = this.getConfig();
    this.compilerOptions = this.getCompilerOptionsFromConfig(config);
  }

  getCompilerOptions() {
    return this.compilerOptions;
  }

  getConfig() {
    const { error, config } = ts.readConfigFile(this.path, ts.sys.readFile);
    if (error) {
      logger.error(error.messageText.toString());
    }
    return config;
  }

  getCompilerOptionsFromConfig(config: { compilerOptions: any }) {
    const { options } = ts.convertCompilerOptionsFromJson(config.compilerOptions, './');
    return options;
  }
}
