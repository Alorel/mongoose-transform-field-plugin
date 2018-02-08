import {Query, Schema} from 'mongoose';

/**
 * Represents the completion of an asynchronous operation
 */
interface Thenable<T> {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param reject The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TRes = never>(reject?: ((why: any) => TRes | PromiseLike<TRes>) | undefined | null): Thenable<T | TRes>;

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param ok The callback to execute when the Promise is resolved.
   * @param err The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then<R1 = T, R2 = never>(ok?: ((value: T) => R1 | PromiseLike<R1>) | undefined | null,
                           err?: ((why: any) => R2 | PromiseLike<R2>) | undefined | null): Thenable<R1 | R2>;
}

export type SyncTransform<T = any> = (val: T) => T;
export type AsyncTransform<T = any> = (val: T) => Thenable<T>;

interface Update {
  $set: any;
  $setOnInsert: any;

  [k: string]: any;
}

export class MongooseTransformFieldPlugin {

  /** @internal */
  private static promise: typeof Promise = Promise;

  public static set promiseLibrary(lib: any) {
    MongooseTransformFieldPlugin.promise = lib;
  }

  public static normalise(schema: Schema,
                          sourceField: string,
                          targetField: string,
                          ...fields: string[]): typeof MongooseTransformFieldPlugin {
    fields = [sourceField, targetField].concat(fields);

    //tslint:disable-next-line:no-magic-numbers
    if (fields.length % 2 !== 0) {
      throw new TypeError('The number of fields must be even');
    }

    //tslint:disable-next-line:no-magic-numbers
    for (let i = 0; i < fields.length; i += 2) {
      MongooseTransformFieldPlugin.transformSyncInternal(
        schema,
        fields[i],
        fields[i + 1],
        MongooseTransformFieldPlugin.normaliseTransformFn
      );
    }

    return MongooseTransformFieldPlugin;
  }

  public static transformAsync(schema: Schema,
                               field: string,
                               transformer: AsyncTransform<any>): typeof MongooseTransformFieldPlugin;

  public static transformAsync(schema: Schema,
                               field: string,
                               parallel: boolean,
                               transformer: AsyncTransform<any>): typeof MongooseTransformFieldPlugin;

  public static transformAsync(schema: Schema,
                               field: string,
                               parallelOrTransformer: boolean | AsyncTransform<any>,
                               possibleTransformer?: AsyncTransform<any>): typeof MongooseTransformFieldPlugin {
    let parallel: boolean;
    let fn: AsyncTransform<any>;

    if (typeof parallelOrTransformer === 'function') {
      parallel = false;
      fn = parallelOrTransformer;
    } else {
      parallel = parallelOrTransformer;
      fn = <AsyncTransform<any>>possibleTransformer;
    }

    function onSave(this: any, done: any): void {
      if (field in this) {
        fn(this[field])
          .then((res: any) => {
            this[field] = res;
            done();
          })
          .catch(done);
      } else {
        done();
      }
    }

    function onUpdate(this: Query<any>, done: any): void {
      const promises: Thenable<void>[] = [];
      const upd: Update = this.getUpdate() || <any>{};

      if (field in upd) {
        promises.push(
          fn(upd[field])
            .then((res: any): void => {
              this.update({[field]: res});
            })
        );
      }

      if (upd.$set && field in upd.$set) {
        promises.push(
          fn(upd.$set[field])
            .then((res: any): void => {
              this.update({$set: {[field]: res}});
            })
        );
      }

      if (upd.$setOnInsert && field in upd.$setOnInsert) {
        promises.push(
          fn(upd.$setOnInsert[field])
            .then((res: any): void => {
              this.update({$setOnInsert: {[field]: res}});
            })
        );
      }

      MongooseTransformFieldPlugin.promise.all(promises)
        .then(() => {
          done();
        })
        .catch(done);
    }

    if (parallel) {
      function updateWrapper(this: any, next: any, done: any): void {
        next();
        onUpdate.call(this, done);
      }

      schema.pre('save', true, function(this: any, next: any, done: any): void {
        next();
        onSave.call(this, done);
      });
      schema.pre('update', true, updateWrapper);
      schema.pre('findOneAndUpdate', true, updateWrapper);
    } else {
      schema.pre('save', onSave);
      schema.pre('update', onUpdate);
      schema.pre('findOneAndUpdate', onUpdate);
    }

    return MongooseTransformFieldPlugin;
  }

  public static transformSync(schema: Schema,
                              field: string,
                              transformer: SyncTransform<any>): typeof MongooseTransformFieldPlugin {
    MongooseTransformFieldPlugin.transformSyncInternal(
      schema,
      field,
      field,
      transformer
    );

    return MongooseTransformFieldPlugin;
  }

  /** @internal */
  private static normaliseTransformFn(inp: string): string {
    return inp.toLowerCase();
  }

  /** @internal */
  private static transformSyncInternal(schema: Schema,
                                       source: string,
                                       target: string,
                                       transformer: SyncTransform<any>): void {
    schema.pre('save', function(this: any): void {
      if (source in this) {
        this[target] = transformer(this[source]);
      }
    });

    function preUpdate(this: Query<any>): void {
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
    }

    schema.pre('update', preUpdate);
    schema.pre('findOneAndUpdate', preUpdate);
  }
}
