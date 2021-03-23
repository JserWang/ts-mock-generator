import ts from 'typescript';
import { TsConfigResolver } from '../resolver/config';
import { getSourceFiles, isMatched } from '../utils';
import { getClassMethods, getClassName } from './class';
import { ExpressionEntry, isRequestExpression, serializeExpression } from './expression';
import { getMethodEntry } from './method';

declare type TRegexp = RegExp | RegExp[] | undefined;

export const visitFiles = (
  configPath: string,
  files: string[],
  includes: TRegexp,
  excludes?: TRegexp
) => {
  const configResolver = new TsConfigResolver(configPath);
  const { sourceFiles, checker } = getSourceFiles(files, configResolver.getCompilerOptions());
  let result = new Array<ExpressionEntry | null>();

  const visit = (node: ts.Node) => {
    if (!ts.isClassDeclaration(node)) {
      return;
    }
    const className = getClassName(node);
    // According to includes and excludes to get qualified class
    if (!isMatched(className, includes) || isMatched(className, excludes)) {
      return;
    }

    const methods = getClassMethods(node);
    // Get all expression in method
    let expressions = new Array<ts.CallExpression>();
    methods.forEach((method) => {
      expressions = expressions.concat(getMethodEntry(method).expressions);
    });

    // Get request expressions
    expressions = expressions.filter((exp) => isRequestExpression(exp));

    result = expressions.map((expression) => serializeExpression(expression, checker));
  };

  sourceFiles.forEach((sourceFile) => {
    // ignore *.d.ts
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit);
    }
  });

  return result;
};
