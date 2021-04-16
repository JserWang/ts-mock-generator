import faker from 'faker';
import { ExpressionEntry } from '../compiler/expression';
import { StructureDifference } from '../resolver/data';
import { MockData } from '../types';
import { toString } from '../utils';

const getValueFromObject = (obj: Record<string, any>): Record<string, any> => {
  let result = {} as Record<string, any>;
  if (!Array.isArray(obj)) {
    Object.keys(obj).forEach((key) => {
      if (Array.isArray(obj[key])) {
        result[key] = obj[key][0];
      } else if (typeof obj[key] === 'object') {
        result[key] = getValueFromObject(obj[key]);
      } else {
        result[key] = generateBasicTypeValue(obj[key]);
      }
    });
  } else {
    return [getValueFromObject(obj[0])];
  }
  return result;
};

const generateBasicTypeValue = (valueType: string): string | number | string[] | number[] => {
  switch (valueType) {
    case 'string':
      return faker.random.word();
    case 'string[]':
      return [faker.random.word()];
    case 'number':
      return faker.random.number();
    case 'number[]':
      return [faker.random.number()];
    default:
      return typeof valueType === 'string' ? toString(valueType) : valueType;
  }
};

export const generateMockData = (
  entry: ExpressionEntry[],
  originDataMap: Map<string, MockData>,
  difference: StructureDifference
): MockData[] => {
  return entry.map(({ url, responseBody }) => {
    if (!difference.has(url) && originDataMap.has(url)) {
      return originDataMap.get(url) as MockData;
    }

    return {
      url,
      response: getValueFromObject(responseBody),
    };
  });
};
