import chalk from 'chalk';
import { existsSync } from 'fs';
import isEqual from 'lodash.isequal';
import watch from 'node-watch';
import { join } from 'path';
import { visitFiles } from '../compiler';
import { ExpressionEntry } from '../compiler/expression';
import { MOCK_DATA_FILE, MOCK_STRUCTURE_FILE } from '../constants';
import { generateMockData } from '../generator/mock';
import { MockData } from '../types';
import { createJsonFile, getFilesFromPathByRule, logger, readFile } from '../utils';

interface Options {
  /**
   * base file path
   */
  basePath: string;
  /**
   * tsconfig path
   */
  configPath: string;
  /**
   * mock dir
   */
  mockDir?: string;
  includes: RegExp | RegExp[];
  excludes?: RegExp | RegExp[];
}

export class MockDataResolver {
  private mockFilePath: string = '';
  private mockStructurePath: string = '';
  private opts: Options;
  private originStructure: ExpressionEntry[] = [];
  private originMockData: MockData[] = [];

  constructor(opts: Options) {
    this.opts = opts;

    if (opts.mockDir) {
      this.mockFilePath = join(opts.mockDir, MOCK_DATA_FILE);
      this.mockStructurePath = join(opts.mockDir, MOCK_STRUCTURE_FILE);
      this.originMockData = this.getDataFromMockFile();
      this.originStructure = this.getStructureFromJson();
    }
  }

  getOrGenerateData() {
    if (this.originMockData.length === 0) {
      const structure = this.getStructureFromFiles();
      const mockData = generateMockData(structure, new Map(), []);
      if (this.opts.mockDir) {
        this.createStructureFile(structure);
        this.createMockFile(mockData);
      }
      this.originMockData = mockData;
    }

    return this.originMockData;
  }

  private createMockFile(mockData: MockData[]) {
    logger.info('create mock json file');
    createJsonFile(this.mockFilePath, mockData);
  }

  private createStructureFile(structure: ExpressionEntry[]) {
    logger.info('create structure json file');
    createJsonFile(this.mockStructurePath, structure);
  }

  private getDataFromMockFile(): MockData[] {
    return JSON.parse(readFile(this.mockFilePath) || '[]');
  }

  /**
   * Get structure from specified file through ast
   */
  private getStructureFromFiles(): ExpressionEntry[] {
    const { basePath, configPath, includes, excludes } = this.opts;
    const files = getFilesFromPathByRule('**/*.ts', basePath);
    const structure = visitFiles(configPath, files, includes, excludes);
    // filter if item is null
    return structure.filter((item) => !!item) as ExpressionEntry[];
  }

  /**
   * Get the structure from structure.json
   */
  private getStructureFromJson(): ExpressionEntry[] {
    return JSON.parse(readFile(this.mockStructurePath) || '[]');
  }

  watchMockFile(callback: (mockData: MockData[]) => void) {
    if (!existsSync(this.mockFilePath)) {
      return;
    }
    watch(this.mockFilePath, (event) => {
      if (event === 'update') {
        logger.info('Update the response mock data');
        const mockData = (this.originMockData = this.getDataFromMockFile());
        callback(mockData);
      }
    });
  }

  watchRequestFile(callback: (mockData: MockData[]) => void) {
    const { basePath } = this.opts;
    if (!existsSync(basePath)) {
      return;
    }
    watch(
      basePath,
      {
        recursive: true,
        // ignore mock data and mock structure files
        filter: (fileName) => {
          return (
            fileName.indexOf(MOCK_DATA_FILE) === -1 || fileName.indexOf(MOCK_STRUCTURE_FILE) === -1
          );
        },
      },
      (event) => {
        if (event === 'update') {
          const structure = this.getStructureFromFiles();
          const differences = this.getStructureDifferences(this.originStructure, structure);
          if (differences.length === 0) {
            return;
          }
          logger.info(
            `Different structures are monitored: '${chalk.red(
              differences.join(',')
            )}', regenerate mock file`
          );

          const mockData = generateMockData(
            structure,
            mockData2Map(this.originMockData),
            differences
          );

          this.originMockData = mockData;
          this.originStructure = structure;

          if (this.opts.mockDir) {
            // will trigger mock file watcher
            this.createStructureFile(structure);
            this.createMockFile(mockData);
          } else {
            callback(this.originMockData);
          }
        }
      }
    );
  }

  /**
   * Get the difference in two structures
   * @param originStructure
   * @param structure
   */
  private getStructureDifferences(
    originStructure: ExpressionEntry[],
    structure: ExpressionEntry[]
  ) {
    const originMap = expressionArray2Map(originStructure);
    const currentMap = expressionArray2Map(structure);

    const differences = new Array<string>();
    currentMap.forEach((value, key) => {
      if (originMap.has(key)) {
        if (!isEqual(originMap.get(key), currentMap.get(key))) {
          differences.push(key);
        }
      } else {
        // When it does not exist in the original structure, it is proved to be newly added and directly added
        differences.push(key);
      }
    });
    return differences;
  }
}

const expressionArray2Map = (expressions: ExpressionEntry[]) => {
  let result = new Map<string, Record<string, any>>();
  expressions.forEach((item) => {
    result.set(item.url, item.responseBody);
  });
  return result;
};

const mockData2Map = (list: MockData[]) => {
  const result = new Map<string, MockData>();
  list.forEach((item) => {
    result.set(item.url, item);
  });
  return result;
};
