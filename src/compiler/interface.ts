import ts from 'typescript';
import { INDEXABLE_TYPE } from '../constants';
import { getIdentifierText } from '../utils';
import { EnumEntry, serializeEnum } from './enum';

interface IProperty {
  key: string;
  kind?: any;
  value?: any;
}

export interface InterfaceEntry {
  name?: string;
  kind?: number;
  generics?: string[];
  extends?: string[];
  properties?: IProperty[];
}

/**
 * Get generic types in interface
 * @param paramDeclarations
 */
const getGeneric = (paramDeclarations: ts.NodeArray<ts.TypeParameterDeclaration>): string[] =>
  paramDeclarations.map((declaration) => getIdentifierText(declaration.name));

/**
 * Get members in interface
 * @param members
 */
const eachMembers = (
  members: ts.NodeArray<ts.TypeElement>,
  checker: ts.TypeChecker
): IProperty[] => {
  let properties = new Array<IProperty>();

  members.forEach((typeElement) => {
    if (ts.isPropertySignature(typeElement)) {
      properties.push(serializeProperty(typeElement, checker));
    } else if (ts.isIndexSignatureDeclaration(typeElement)) {
      properties.push(serializeIndexable(typeElement, checker));
    }
  });
  return properties;
};

/**
 * Serialize each property and its corresponding type
 * @param signature
 */
const serializeProperty = (signature: ts.PropertySignature, checker: ts.TypeChecker): IProperty => {
  const typeNode = signature.type;
  if (!typeNode) {
    return { key: '' };
  }
  return {
    key: ts.isIdentifier(signature.name) ? getIdentifierText(signature.name) : '',
    kind: typeNode.kind,
    value: serializePropertyValue(typeNode, checker),
  };
};

/**
 * Serialize indexable types
 * @param signature
 * @param checker
 */
const serializeIndexable = (
  signature: ts.IndexSignatureDeclaration,
  checker: ts.TypeChecker
): IProperty => {
  const typeNode = signature.type;
  return {
    key: INDEXABLE_TYPE,
    kind: typeNode.kind,
    value: serializePropertyValue(typeNode, checker),
  };
};

/**
 * Serialize property value
 * When the property type is other interface, call serializeInterface again
 * @param node
 * @param checker
 */
const serializePropertyValue = (node: ts.Node, checker: ts.TypeChecker): any => {
  if (ts.isTypeReferenceNode(node)) {
    return processTypeReferenceNode(node, checker);
  } else if (ts.isArrayTypeNode(node)) {
    return serializePropertyValue(node.elementType, checker);
  } else if (ts.isLiteralTypeNode(node)) {
    const type = checker.getTypeAtLocation(node);
    return type.isStringLiteral() || type.isNumberLiteral() ? type.value : node.getText();
  }
  return node.getText();
};

/**
 * process interface extends case
 * @param nodeArray
 */
const serializeHeritageClause = (
  nodeArray: ts.NodeArray<ts.ExpressionWithTypeArguments>,
  checker: ts.TypeChecker
) => {
  const superNames = new Array<string>();
  let properties = new Array<IProperty>();

  nodeArray.forEach((node) => {
    const entry = processTypeReferenceNode(node.expression, checker) as InterfaceEntry;
    superNames.push(entry.name || '');
    properties = properties.concat(entry.properties || []);
  });
  return {
    superNames,
    properties,
  };
};

/**
 * serialize interface
 * @param node
 */
export const serializeInterface = (
  node: ts.InterfaceDeclaration,
  checker: ts.TypeChecker
): InterfaceEntry => {
  const name = getIdentifierText(node.name);

  const entry: InterfaceEntry = {
    name,
    kind: node.kind,
    properties: eachMembers(node.members, checker),
  };

  if (node.typeParameters) {
    entry.generics = getGeneric(node.typeParameters);
  }

  // Process the extends in the interface, because there is no implements keyword in the interface, so here when there is heritageClauses,
  // Use the first one directly to be extends
  if (node.heritageClauses) {
    const { superNames, properties } = serializeHeritageClause(
      node.heritageClauses[0].types,
      checker
    );
    entry.extends = superNames;
    entry.properties = properties.concat(entry.properties || []);
  }

  return entry;
};

const getDeclaration = (node: ts.Node, checker: ts.TypeChecker) => {
  const type = checker.getTypeAtLocation(node);
  const symbol = type.symbol || type.aliasSymbol;
  const declarations = symbol?.getDeclarations() as ts.Declaration[];
  return declarations![0];
};

export interface RecordEntry {
  kind: number;
  type: string;
  keyType: any;
  valueType: any;
}

/**
 * TypeReference to interface、Enum or generic string
 * @param node
 * @param checker
 */
export const processTypeReferenceNode = (
  node: ts.TypeReferenceNode | ts.LeftHandSideExpression | ts.TypeNode,
  checker: ts.TypeChecker
): InterfaceEntry | EnumEntry | RecordEntry | string => {
  const declaration = getDeclaration(node, checker);
  if (ts.isInterfaceDeclaration(declaration)) {
    return serializeInterface(declaration, checker);
  } else if (ts.isEnumDeclaration(declaration)) {
    return serializeEnum(declaration);
  } else if (ts.isTypeParameterDeclaration(declaration)) {
    // process like T = any
    return getIdentifierText(declaration.name);
  } else if (ts.isMappedTypeNode(declaration)) {
    let typeNode = node as ts.TypeReferenceNode;
    const typeName = typeNode.typeName.getText();
    const isArray = ts.isArrayTypeNode(typeNode.typeArguments![1]);
    if (typeName === 'Record') {
      return {
        kind: ts.SyntaxKind.MappedType,
        type: 'Record',
        keyType: serializePropertyValue(typeNode.typeArguments![0], checker),
        valueType: isArray
          ? [serializePropertyValue(typeNode.typeArguments![1], checker)]
          : serializePropertyValue(typeNode.typeArguments![1], checker),
      };
    }
  }

  return declaration.getText();
};
