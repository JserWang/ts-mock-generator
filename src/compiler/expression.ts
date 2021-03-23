import ts from 'typescript';
import { METHODS } from '../constants';
import { getIdentifierText, getStringLiteralValue, logger } from '../utils';
import { InterfaceEntry, processTypeReferenceNode } from './interface';
import { getMethodEntry } from './method';

export interface ExpressionEntry {
  url: string;
  responseBody: Record<string, any>;
}

declare type ResponseDataType = InterfaceEntry | InterfaceEntry[] | string;

/**
 * Serialize request CallExpression
 * @param node
 */
export const serializeExpression = (
  node: ts.CallExpression,
  checker: ts.TypeChecker
): ExpressionEntry | null => {
  const targetNode = getLeafCallExpression(node);
  const url = getUrlFromArguments(targetNode, checker);
  const customResponseInterface = getCustomResponseInterface(targetNode, checker);
  if (!customResponseInterface) {
    logger.error(`url: ${url}, can not find customResponseBody`);
    return null;
  }
  const typeArgumentInterface = getTypeArgumentInterface(targetNode, checker);

  return {
    url,
    responseBody: getResponseBody(customResponseInterface, typeArgumentInterface),
  };
};

/**
 * Get the url value through the first parameter of request
 * @param node
 * @param checker
 */
const getUrlFromArguments = (node: ts.CallExpression, checker: ts.TypeChecker): string => {
  const urlExpression = node.arguments[0];
  if (ts.isPropertyAccessExpression(urlExpression)) {
    // Assign value via property
    return processPropertyAccessExpression(urlExpression, checker);
  } else if (ts.isStringLiteral(urlExpression)) {
    // Assign value via string
    return getStringLiteralValue(urlExpression);
  }
  return '';
};

const processPropertyAccessExpression = (
  node: ts.PropertyAccessExpression,
  checker: ts.TypeChecker
): string => {
  const symbol = checker.getSymbolAtLocation(node);
  if (symbol) {
    const declaration = symbol.valueDeclaration;
    if (!ts.isPropertyAssignment(declaration) && !ts.isEnumMember(declaration)) {
      return '';
    }
    if (declaration.initializer && ts.isStringLiteral(declaration.initializer)) {
      return getStringLiteralValue(declaration.initializer);
    }
  }
  return '';
};

/**
 * Assemble the response body
 * @param responseBody
 * @param generic
 */
const getResponseBody = (responseBody: InterfaceEntry, generic: ResponseDataType) => {
  transformResponseBody(responseBody, generic);
  return formatInterface(responseBody);
};

const transformResponseBody = (responseBody: InterfaceEntry, generic: ResponseDataType) => {
  responseBody.properties = responseBody.properties?.map((item) => {
    if (
      item.kind === ts.SyntaxKind.TypeReference &&
      responseBody.generics?.indexOf(item.value) !== -1
    ) {
      item.value = generic;
    }
    return item;
  });
};

/**
 * Format interface to Record
 * @param entry
 */
const formatInterface = (entry: InterfaceEntry | InterfaceEntry[]): Record<string, any> => {
  // process <MResult[]>
  if (Array.isArray(entry)) {
    return [formatInterface(entry[0])];
  }
  let formatted = {} as Record<string, any>;
  entry.properties?.forEach(({ key, kind, value }) => {
    if (ts.SyntaxKind.ArrayType === kind && typeof value === 'string') {
      formatted[key] = `${value}[]`;
    } else if (ts.SyntaxKind.ArrayType === kind) {
      formatted[key] = [formatInterface(value)];
    } else if (
      ts.SyntaxKind.TypeReference === kind &&
      ts.SyntaxKind.InterfaceDeclaration === value.kind
    ) {
      formatted[key] = formatInterface(value);
    } else if (
      ts.SyntaxKind.TypeReference === kind &&
      ts.SyntaxKind.EnumDeclaration === value.kind
    ) {
      formatted[key] = value.properties;
    } else {
      formatted[key] = value;
    }
  });
  return formatted;
};

/**
 * Get CustomResponse corresponding to Interface
 * @param node
 */
const getCustomResponseInterface = (
  node: ts.CallExpression,
  checker: ts.TypeChecker
): InterfaceEntry | null => {
  // Get the symbol corresponding to the method in the request
  const symbol = checker.getSymbolAtLocation(node.expression);
  if (!symbol) {
    return null;
  }
  // Get the valueDeclaration in the symbol
  const valueDeclaration = symbol.valueDeclaration;
  if (!ts.isMethodDeclaration(valueDeclaration)) {
    return null;
  }
  // Get the return fetch() part of the method
  const expression = getMethodEntry(valueDeclaration).expressions[0];
  if (!ts.isCallExpression(expression)) {
    return null;
  }
  // Get the signature of the fetch method
  const signature = checker.getResolvedSignature(expression);
  // Get the fetch declaration
  const declaration = signature?.getDeclaration();
  if (
    declaration &&
    (ts.isMethodDeclaration(declaration) ||
      ts.isArrowFunction(declaration) ||
      ts.isFunctionDeclaration(declaration))
  ) {
    // Get R = ResponseBody<T> in the second TypeParamter in fetch
    const responseBody = declaration.typeParameters![1].default;
    if (responseBody) {
      return processTypeReferenceNode(responseBody, checker) as InterfaceEntry;
    }
  }
  return null;
};

/**
 * Get the generic corresponding Interface in Request
 * @param node
 */
const getTypeArgumentInterface = (
  node: ts.CallExpression,
  checker: ts.TypeChecker
): ResponseDataType => {
  const typeArgument = node.typeArguments![0];
  if (ts.isTypeReferenceNode(typeArgument)) {
    return processTypeReferenceNode(typeArgument, checker) as InterfaceEntry;
  } else if (ts.isArrayTypeNode(typeArgument) && ts.isTypeReferenceNode(typeArgument.elementType)) {
    // just like <MResult[]>
    return [processTypeReferenceNode(typeArgument.elementType, checker) as InterfaceEntry];
  }
  // <string> || <string[]>
  return typeArgument.getText();
};

/**
 * Determine whether CallExpression is a Request by METHODS
 * @param node
 */
export const isRequestExpression = (node: ts.CallExpression): boolean => {
  const targetNode = getLeafCallExpression(node);
  return METHODS.indexOf(getExpressionName(targetNode)) !== -1;
};

/**
 * Recursively find the CallExpression of the leaf node in the AST
 *
 * such as:
 * The AST structure correspondence of `Request.get().then().then()`:
 *
 * CallExpression -- Request.get().then().then()
 *  PropertyAccessExpression
 *    CallExpression -- Request.get().then()
 *      PropertyAccessExpression
 *        CallExpression -- Request.get()
 *          PropertyAccessExpression
 *          TypeReference
 *
 * @param node
 */
export const getLeafCallExpression = (node: ts.CallExpression): ts.CallExpression => {
  const nodeExpression = node.expression;
  if (
    ts.isPropertyAccessExpression(nodeExpression) &&
    ts.isCallExpression(nodeExpression.expression)
  ) {
    return getLeafCallExpression(nodeExpression.expression);
  }
  return node;
};

const getExpressionName = (node: ts.CallExpression): string => {
  const expression = node.expression;
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
    return getIdentifierText(expression.name).toLocaleLowerCase();
  }
  return '';
};
