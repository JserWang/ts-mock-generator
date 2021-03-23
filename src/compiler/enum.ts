import ts from 'typescript';
import { getIdentifierText, getStringLiteralValue } from '../utils';

export interface EnumEntry {
  name?: string;
  kind: number;
  properties?: string[];
}

export const serializeEnum = (node: ts.EnumDeclaration): EnumEntry => {
  node.members;
  return {
    name: getIdentifierText(node.name),
    kind: node.kind,
    properties: node.members.map((enumMember) => {
      if (ts.isIdentifier(enumMember.name)) {
        return getIdentifierText(enumMember.name);
      } else if (ts.isStringLiteral(enumMember.name)) {
        return getStringLiteralValue(enumMember.name);
      }
      return '';
    }),
  };
};
