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
  let parallel: boolean;
  let fn: AsyncTransform<any>;

  if (typeof parallelOrTransformer === 'function') {
    parallel = false;
    fn = parallelOrTransformer;
  } else {
    parallel = parallelOrTransformer;
    fn = <AsyncTransform<any>>possibleTransformer;
  }

  const onSave = function(this: any, done: any): void {
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
  };

  const onUpdate = function(this: Query<any>, done: any): void {
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

export = transformAsync;
