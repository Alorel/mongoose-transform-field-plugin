import {Query, Schema} from 'mongoose';
import {Update} from '../types/_Update';
import {Thenable} from '../types/Thenable';
import {AsyncTransform} from '../types/Transform';

function transformAsync(schema: Schema, field: string, transformer: AsyncTransform<any>): void;
function transformAsync(schema: Schema, field: string, parallel: boolean, transformer: AsyncTransform<any>): void;
function transformAsync(schema: Schema,
                        field: string,
                        parallelOrTransformer: boolean | AsyncTransform<any>,
                        possibleTransformer?: AsyncTransform<any>): void {
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
    if (this[field] !== undefined) {
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

    if (upd[field] !== undefined) {
      promises.push(
        fn(upd[field])
          .then((res: any): void => {
            this.update({[field]: res});
          })
      );
    }

    if (upd.$set && upd.$set[field] !== undefined) {
      promises.push(
        fn(upd.$set[field])
          .then((res: any): void => {
            this.update({$set: {[field]: res}});
          })
      );
    }

    if (upd.$setOnInsert && upd.$setOnInsert[field] !== undefined) {
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
  export interface TransformAsyncOptions {
    field: string;
    parallel?: boolean;
    transformer: AsyncTransform<any>;
  }

  export function plugin(schema: Schema, options: TransformAsyncOptions): void {
    if (!options) {
      throw new TypeError('Options are required');
    }

    transformAsync(schema, options.field, !!options.parallel, options.transformer);
  }
}

export = transformAsync;
