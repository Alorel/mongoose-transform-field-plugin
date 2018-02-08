import {Schema} from 'mongoose';
import {SyncTransform} from '../types/Transform';
import {transformSyncInternal} from './_transformSyncInternal';

export = function(schema: Schema, field: string, transformer: SyncTransform<any>): void {
  transformSyncInternal(
    schema,
    field,
    field,
    transformer
  );
};
