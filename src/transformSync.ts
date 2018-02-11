import {Schema} from 'mongoose';
import {SyncTransform} from '../types/Transform';
import {transformSyncInternal} from './_transformSyncInternal';

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
  export interface TransformSyncOptions {
    field: string;
    transformer: SyncTransform<any>;
  }

  export function plugin(schema: Schema, options: TransformSyncOptions): void {
    if (!options) {
      throw new Error('Options are required');
    }

    transformSync(schema, options.field, options.transformer);
  }
}

export = transformSync;
