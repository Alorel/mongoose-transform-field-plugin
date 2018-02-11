import {Query, Schema} from 'mongoose';
import {Update} from '../types/_Update';
import {SyncTransform} from '../types/Transform';

/**
 * Internal handler for synchronous transformations.
 * @internal
 * @param {"mongoose".Schema} schema The schema to apply this to
 * @param {string} source The source field name
 * @param {string} target The target field name
 * @param {SyncTransform<any>} transformer The transformation function
 */
export function transformSyncInternal(schema: Schema,
                                      source: string,
                                      target: string,
                                      transformer: SyncTransform<any>): void {
  if (!schema) {
    throw new TypeError('Schema is required');
  }

  schema.pre('save', function(this: any): void {
    if (this[source] !== undefined) {
      this[target] = transformer(this[source]);
    }
  });

  const preUpdate = function(this: Query<any>): void {
    const upd: Update = this.getUpdate() || /* istanbul ignore next */ {};

    if (upd[source] !== undefined) {
      this.update({
        [target]: transformer(upd[source])
      });
    }
    if (upd.$set && upd.$set[source] !== undefined) {
      this.update({
        $set: {
          [target]: transformer(upd.$set[source])
        }
      });
    }
    if (upd.$setOnInsert && upd.$setOnInsert[source] !== undefined) {
      this.update({
        $setOnInsert: {
          [target]: transformer(upd.$setOnInsert[source])
        }
      });
    }
  };

  schema.pre('update', preUpdate);
  schema.pre('findOneAndUpdate', preUpdate);
}
