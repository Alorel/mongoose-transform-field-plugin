import {Schema} from 'mongoose';
import {SyncTransform} from '../types/Transform';
import {transformSyncInternal} from './_transformSyncInternal';

/**
 * Perform a synchronous transformation on the given field
 * @param schema Schema to apply the transformation to
 * @param field Field to apply the transformation to
 * @param transformer The transformation function.
 */
function transformSync(schema: Schema, field: string, transformer: SyncTransform<any>): void {
  if (typeof field !== 'string' || !field) {
    throw new TypeError('The field must be a non-empty string');
  } else if (typeof transformer !== 'function') {
    throw new TypeError('The transformer must be a function');
  }

  transformSyncInternal(
    schema,
    field,
    field,
    transformer
  );
}

namespace transformSync {
  /** Synchronous transformer options */
  export interface TransformSyncOptions {
    /** Field to apply the transformation to */
    field: string;
    /** The transformation function. */
    transformer: SyncTransform<any>;
  }

  /**
   * Perform a synchronous transformation on the given field
   * @param schema Schema to apply the transformation to
   * @param options Configuration
   */
  export function plugin(schema: Schema, options: TransformSyncOptions): void {
    if (!options) {
      throw new Error('Options are required');
    }

    transformSync(schema, options.field, options.transformer);
  }
}

export = transformSync;
