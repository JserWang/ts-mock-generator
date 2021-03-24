import fastGlob from 'fast-glob';
import { resolve } from 'path';

/**
 * remove the `'` or `"`
 * @param value
 */
export const toString = (value: string) => value.replace(/\"/g, '').replace(/\'/g, '');

/**
 *
 * @param target
 * @param reg
 */
export const isMatched = (target: string, reg?: RegExp | RegExp[]): boolean => {
  if (Array.isArray(reg)) {
    if (reg.length > 0) {
      return reg.some((item) => item.test(target));
    }
  } else if (reg) {
    return reg.test(target);
  }
  return false;
};

export const getFilesFromPathByRule = (rule: string, path: string) => {
  return fastGlob
    .sync(rule, {
      cwd: path,
    })
    .map((file) => resolve(path, file));
};
