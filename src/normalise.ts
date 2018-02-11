import {Schema} from 'mongoose';
import * as removeAccents from 'remove-accents';
import {transformSyncInternal} from './_transformSyncInternal';

/**
 * Accent removal and normalisation function
 * @internal
 * @param inp Input to transform
 * @returns Transformed input
 */
function normaliseTransformFn(inp: string | null | undefined): string | null | undefined {
  if (typeof inp === 'string') {
    return removeAccents.remove(inp.trim()).toLowerCase();
  }

  return inp;
}

/**
 * Normalise source fields into target fields. The target field values will be trimmed, lowercased and have their
 * accented characters converted to base latin ones.
 * @param schema Schema to apply the plugin to
 * @param fields Fields to normalise. The keys should be the source, non-normalised fields while the values will hold
 * the normalised output.
 */
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
  /**
   * Normalise source fields into target fields. The target field values will be trimmed, lowercased and have their
   * accented characters converted to base latin ones.
   * @param schema Schema to apply the plugin to
   * @param fields Fields to normalise. The keys should be the source, non-normalised fields while the values will hold
   * the normalised output.
   */
  export function plugin(schema: Schema, fields?: any): void {
    normalise(schema, fields);
  }
}

export = normalise;
