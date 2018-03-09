import {ObjectID} from 'bson';
import {expect} from 'chai';
import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import {Model, Schema} from 'mongoose';
import {v4} from 'uuid';
import {MongooseTransformFieldPlugin} from '../../src/index';
import {TransformAsyncOptions} from '../../src/transformAsync';
import {AsyncTransform} from '../../types/Transform';
import {BaseDoc} from '../bootstrap';

// false positive
//tslint:disable:no-unnecessary-type-assertion

describe('transformAsync', () => {
  it('Should throw if schema is not provided', () => {
    expect(() => MongooseTransformFieldPlugin.transformAsync(<any>0, '', <any>1))
      .to.throw(TypeError, 'Schema is required');
  });

  it('Should throw if field is not a string', () => {
    expect(() => MongooseTransformFieldPlugin.transformAsync(new Schema(), <any>1, <any>1))
      .to.throw(TypeError, 'Field must be a non-empty string');
  });

  it('Should throw if field is an empty string', () => {
    expect(() => MongooseTransformFieldPlugin.transformAsync(new Schema(), '', <any>1))
      .to.throw(TypeError, 'Field must be a non-empty string');
  });

  it('Should throw if transformer is not a fn', () => {
    expect(() => MongooseTransformFieldPlugin.transformAsync(new Schema(), 'x', <any>1))
      .to.throw(TypeError, 'Transformer must be a function');
  });

  it('Should throw if options are not provided', () => {
    expect(() => {
      const sch = new Schema();
      sch.plugin(MongooseTransformFieldPlugin.transformAsync.plugin);
    }).to
      .throw(TypeError, 'Options are required');
  });

  const transformer: AsyncTransform<string> = (f: string): Promise<string> => Promise.resolve(f.toLowerCase());
  let model: Model<BaseDoc>;
  let d: BaseDoc;

  interface Variations {
    direct: {
      sigs: {
        explicitlyParallel: any[];
        explicitlyUnparallel: any[];
        implicitlyUnparallel: any[];
      };
    };
    plugin: {
      sigs: {
        explicitlyParallel: TransformAsyncOptions;
        explicitlyUnparallel: TransformAsyncOptions;
        implicitlyUnparallel: TransformAsyncOptions;
      };
    };
  }

  const variations: Variations = {
    direct: {
      sigs: {
        explicitlyParallel: [true, transformer],
        explicitlyUnparallel: [false, transformer],
        implicitlyUnparallel: [transformer]
      }
    },
    plugin: {
      sigs: {
        explicitlyParallel: {field: 'foo', transformer, parallel: true},
        explicitlyUnparallel: {field: 'foo', transformer, parallel: false},
        implicitlyUnparallel: {field: 'foo', transformer}
      }
    }
  };

  _.forEach(variations, (spec, label) => {
    describe(`Core: ${label}`, () => {
      _.forEach(spec.sigs, (signature: any, suite: string) => {
        describe(suite, () => {
          let sch: Schema;

          before('Init schema', () => {
            sch = new Schema(
              {
                bar: String,
                foo: String
              },
              {skipVersioning: true, versionKey: false}
            );
          });

          before('Apply plugin', () => {
            if (label === 'direct') {
              signature = [sch, 'foo'].concat(signature);
              MongooseTransformFieldPlugin.transformAsync.apply(null, signature);
            } else {
              sch.plugin(MongooseTransformFieldPlugin.transformAsync.plugin, signature);
            }
          });

          before('Init model', () => {
            model = mongoose.model<BaseDoc>(v4(), sch);
          });

          beforeEach('Create', async() => {
            d = await model.create({foo: 'QUX'});
          });

          describe('Should skip on save when field is absent', () => {
            let f: BaseDoc;

            before('Create', async function() {
              f = await model.create({bar: 'foo'});
            });

            it('bar should be foo', () => {
              expect(f.bar).to.eq('foo');
            });

            it('foo should be undefined', () => {
              expect(f.foo).to.be.undefined;
            });
          });

          describe('Should skip on update if field is absent', () => {
            let f: BaseDoc;

            before('Run', async() => {
              f = <BaseDoc>await model.findByIdAndUpdate(d._id, {bar: 'boo'}, {new: true});
            });

            it('bar should be boo', () => {
              expect(f.bar).to.eq('boo');
            });

            it('foo should be qux', () => {
              expect(d.foo).to.eq('qux');
            });
          });

          it('Should apply on save', () => {
            expect(d.foo).to.eq('qux');
          });

          describe('Should apply on update', () => {
            it('Without $set', async() => {
              await d.update({foo: 'BAR'});
              d = <BaseDoc>await model.findById(d._id);
              expect(d.foo).to.eq('bar');
            });
            it('With $set', async() => {
              await d.update({$set: {foo: 'BAR'}});
              d = <BaseDoc>await model.findById(d._id);
              expect(d.foo).to.eq('bar');
            });
          });

          describe('With $setOnInsert', () => {
            let f: BaseDoc;

            before('Run', async() => {
              const _id = new ObjectID();
              const upd = {$set: {bar: 'AAAH'}, $setOnInsert: {foo: 'AH'}};
              f = <BaseDoc>await model.findByIdAndUpdate(_id, upd, {upsert: true, new: true});
            });

            it('bar should be AAAH', () => {
              expect(f.bar).to.eq('AAAH');
            });

            it('foo should be ah', () => {
              expect(f.foo).to.eq('ah');
            });
          });

          it('Should apply on findAndUpdate', async() => {
            await model.findByIdAndUpdate(d._id, {foo: 'BAR'});
            d = <BaseDoc>await model.findById(d._id);
            expect(d.foo).to.eq('bar');
          });
        });
      });
    });
  });
});
