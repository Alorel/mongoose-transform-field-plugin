import {Query, Schema} from 'mongoose';
import {Update} from '../types/_Update';
import {Thenable} from '../types/Thenable';
import {AsyncTransform} from '../types/Transform';

/**
 * Perform an asynchronous transformation on the given field
 * @param schema Schema to apply the transformation to
 * @param field Field to apply the transformation to
 * @param transformer The transformation function. This should return a Promise.
 */
function transformAsync<T = any>(schema: Schema, field: string, transformer: AsyncTransform<T>): void;
/**
 * Perform an asynchronous transformation on the given field
 * @param schema Schema to apply the transformation to
 * @param field Field to apply the transformation to
 * @param parallel Whether or not this should run as parallel middleware
 * @param transformer The transformation function. This should return a Promise.
 */
function transformAsync<T = any>(schema: Schema,
                                 field: string,
                                 parallel: boolean,
                                 transformer: AsyncTransform<T>): void;
function transformAsync<T>(schema: Schema,
                           field: string,
                           parallelOrTransformer: boolean | AsyncTransform<T>,
                           possibleTransformer?: AsyncTransform<T>): void {
  if (!schema) {
    throw new TypeError('Schema is required');
  } else if (typeof field !== 'string' || !field) {
    throw new TypeError('Field must be a non-empty string');
  }

  let parallel: boolean;
  let fn: AsyncTransform<any>;

  if (typeof parallelOrTransformer === 'function') {
    parallel = false;
    fn = parallelOrTransformer;
  } else {
    parallel = parallelOrTransformer;
    fn = <AsyncTransform<any>>possibleTransformer;
  }

  if (typeof fn !== 'function') {
    throw new TypeError('Transformer must be a function');
  }

  const onSave = function(this: any, done: any): void {
    if (this[field] !== undefined && this[field] !== null) {
      fn(this[field])
        .then((res: any) => {
          this[field] = res;
          done();
        })
        .catch(done);
    } else {
      done();
    }
  };

  const onUpdate = function(this: Query<any>, done: any): void {
    const promises: Thenable<void>[] = [];
    const upd: Update = this.getUpdate() || /* istanbul ignore next */ <any>{};

    if (upd[field] !== undefined && upd[field] !== null) {
      promises.push(
        fn(upd[field])
          .then((res: any): void => {
            this.update({[field]: res});
          })
      );
    }

    if (upd.$set && upd.$set[field] !== undefined && upd.$set[field] !== null) {
      promises.push(
        fn(upd.$set[field])
          .then((res: any): void => {
            this.update({$set: {[field]: res}});
          })
      );
    }

    if (upd.$setOnInsert && upd.$setOnInsert[field] !== undefined && upd.$setOnInsert[field] !== null) {
      promises.push(
        fn(upd.$setOnInsert[field])
          .then((res: any): void => {
            this.update({$setOnInsert: {[field]: res}});
          })
      );
    }

    Promise.all(promises)
      .then(() => {
        done();
      })
      .catch(done);
  };

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
}

namespace transformAsync {
  /** Options for applying the plugin as a schema plugin */
  export interface TransformAsyncOptions<T = any> {
    /** Field to apply the transformation to */
    field: string;
    /**
     * Whether this should act as a parallel Mongoose middleware
     * @default false
     */
    parallel?: boolean;
    /** The transformation function. This should return a Promise. */
    transformer: AsyncTransform<T>;
  }

  /**
   * Perform an asynchronous transformation on the given field
   * @param schema Schema to apply the transformation to
   * @param options Configuration
   */
  export function plugin(schema: Schema, options?: any): void {
    if (!options) {
      throw new TypeError('Options are required');
    }

    transformAsync(
      schema,
      (<TransformAsyncOptions>options).field,
      !!<any>(<TransformAsyncOptions>options).parallel,
      (<TransformAsyncOptions>options).transformer
    );
  }
}

export = transformAsync;
