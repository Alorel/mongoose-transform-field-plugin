import {Query, Schema} from 'mongoose';
import {Update} from '../types/_Update';
import {SyncTransform} from '../types/Transform';

/** @internal */
export function transformSyncInternal(schema: Schema,
                                      source: string,
                                      target: string,
                                      transformer: SyncTransform<any>): void {
  schema.pre('save', function(this: any): void {
    if (source in this) {
      this[target] = transformer(this[source]);
    }
  });

  const preUpdate = function(this: Query<any>): void {
    const upd: Update = this.getUpdate() || {};

    if (source in upd) {
      this.update({
        [target]: transformer(upd[source])
      });
    }
    if (upd.$set && source in upd.$set) {
      this.update({
        $set: {
          [target]: transformer(upd.$set[source])
        }
      });
    }
    if (upd.$setOnInsert && source in upd.$setOnInsert) {
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
