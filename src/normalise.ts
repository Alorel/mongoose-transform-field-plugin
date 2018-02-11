import {Schema} from 'mongoose';
import {transformSyncInternal} from './_transformSyncInternal';

/**
 * @internal
 * @param {string} inp
 * @returns {string}
 */
function normaliseTransformFn(inp: string | null | undefined): string | null | undefined {
  if (typeof inp === 'string') {
    return inp.trim().toLowerCase();
  }

  return inp;
}

function normalise(schema: Schema, fields: { [sourceField: string]: string }): void {
  if (!schema) {
    throw new Error('Schema is required');
  } else if (!fields) {
    throw new Error('Fields are required');
  }
  const keys: string[] = Object.keys(fields);

  if (!keys.length) {
    throw new Error('At least one field pair is required');
  }

  for (const sourceField of keys) {
    if (!sourceField) {
      throw new TypeError('Source field must be a non-empty string');
    }

    const targetField: string = fields[sourceField];
    if (!targetField || typeof targetField !== 'string') {
      throw new TypeError('Target field must be a non-empty string');
    }

    transformSyncInternal(schema, sourceField, targetField, normaliseTransformFn);
  }
}

namespace normalise {
  export function plugin(schema: Schema, options: { [sourceField: string]: string }): void {
    normalise(schema, options);
  }
}

export = normalise;
