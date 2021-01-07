import ts from 'typescript';
import { toString } from './tool';

export const getSourceFiles = (files: string[], opts: ts.CompilerOptions) => {
  const program = ts.createProgram(files, opts);
  return {
    sourceFiles: program.getSourceFiles(),
    checker: program.getTypeChecker(),
  };
};

/**
 * Get the value of escapedText in Identifier
 * @param identifier
 */
export const getIdentifierText = (identifier: ts.Identifier | undefined): string =>
  identifier ? identifier.escapedText.toString() : '';

/**
 * Get the actual value of StringLiteral
 * @param node
 */
export const getStringLiteralValue = (node: ts.StringLiteral): string => toString(node.getText());
