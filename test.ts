//tslint:disable:no-duplicate-imports no-unused-expression max-file-line-count
import {ObjectID} from 'bson';
import {expect} from 'chai';
import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import {Document, Model, Schema} from 'mongoose';
import {v4} from 'uuid';
import {MongooseTransformFieldPlugin} from './src/index';
import {TransformAsyncOptions} from './src/transformAsync';
import {TransformSyncOptions} from './src/transformSync';
import {AsyncTransform, SyncTransform} from './types/Transform';

describe('MongooseTransformFieldPlugin', () => {
  interface Base {
    bar: string;
    baz: string;
    foo: string;
    qux: string;
  }

  interface BaseDoc extends Base, Document {
  }

  let model: Model<BaseDoc>;
  let d: BaseDoc;
  let d2: BaseDoc;

  before('Connect', () => {
    const connStr = <string>process.env.MONGODB_URL || `mongodb://127.0.0.1/mongoose-transform-field-test`;
    const opts: any = {};

    (<any>mongoose).Promise = Promise;

    return mongoose.connect(connStr, opts);
  });

  describe('transformSyncInternal', () => {
    it('Should throw if schema is not provided', () => {
      expect(() => MongooseTransformFieldPlugin.transformSync(<any>null, 'foo', (_x: string) => 'bar'))
        .to.throw(TypeError, 'Schema is required');
    });
  });

  describe('transformSync', () => {
    it('Should throw if field is not a string', () => {
      expect(() => MongooseTransformFieldPlugin.transformSync(new Schema(), <any>1, <any>1))
        .to.throw(TypeError, 'The field must be a non-empty string');
    });

    it('Should throw if field is an empty', () => {
      expect(() => MongooseTransformFieldPlugin.transformSync(new Schema(), '', <any>1))
        .to.throw(TypeError, 'The field must be a non-empty string');
    });

    it('Should throw if transformer is not a function', () => {
      expect(() => MongooseTransformFieldPlugin.transformSync(new Schema(), 'x', <any>1))
        .to.throw(TypeError, 'The transformer must be a function');
    });

    it('Plugin should throw if options are not provided', () => {
      expect(() => new Schema().plugin(MongooseTransformFieldPlugin.transformSync.plugin))
        .to.throw(Error, 'Options are required');
    });

    const transformer: SyncTransform<string> = (f: string): string => f.toLowerCase();
    const variations = {
      direct() {
        const sch = new Schema(
          {
            bar: String,
            foo: String
          },
          {skipVersioning: true, versionKey: false}
        );
        MongooseTransformFieldPlugin.transformSync(
          sch,
          'foo',
          transformer
        );
        model = mongoose.model<BaseDoc>(v4(), sch);
      },
      plugin() {
        const sch = new Schema(
          {
            bar: String,
            foo: String
          },
          {skipVersioning: true, versionKey: false}
        );
        const opts: TransformSyncOptions = {
          field: 'foo',
          transformer
        };
        sch.plugin(MongooseTransformFieldPlugin.transformSync.plugin, opts);
        model = mongoose.model<BaseDoc>(v4(), sch);
      }
    };

    _.forEach(variations, (bf: any, label: string) => {
      describe(`Core: ${label}`, () => {
        before('init', bf);

        beforeEach('Create', async() => {
          d = await model.create({foo: 'QUX'});
        });

        it('Should skip if the field is not included in update', async() => {
          await model.update({_id: d._id}, {foo: 'BAR'});
          await model.update({_id: d._id}, {bar: v4()});
          const f = <BaseDoc>await model.findById(d._id);
          expect(f.foo).to.eq('bar');
        });

        it('Should skip if the field is not included save', async() => {
          const f = await model.create({bar: v4()});
          expect(f.foo).to.be.undefined;
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
          describe('With $setOnInsert', () => {
            let f: BaseDoc;

            before('run', async() => {
              const _id = new ObjectID();
              const upd = {$set: {bar: 'X'}, $setOnInsert: {foo: 'Y'}};
              f = <BaseDoc>await model.findOneAndUpdate({_id}, upd, {upsert: true, new: true});
            });

            it('bar should be X', () => {
              expect(f.bar).to.eq('X');
            });

            it('foo should be y', () => {
              expect(f.foo).to.eq('y');
            });
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

  describe('normalise', () => {
    it('Should throw if fields % 2 !== 0', () => {
      expect(() => MongooseTransformFieldPlugin.normalise(new Schema(), 'a', 'b', 'c'))
        .to.throw(TypeError, 'The number of fields must be even');
    });

    describe('With 4 fields', () => {
      before('init', async() => {
        const sch = new Schema(
          {
            bar: String,
            baz: String,
            foo: String,
            qux: String
          },
          {skipVersioning: true, versionKey: false}
        );

        MongooseTransformFieldPlugin.normalise(sch, 'foo', 'bar', 'qux', 'baz');
        model = mongoose.model<BaseDoc>(v4(), sch);
      });

      beforeEach('Create', async() => {
        d = await model.create({foo: 'ONE', qux: 'TWO'});
      });

      describe('Save', () => {
        it('foo should be ONE', () => {
          expect(d.foo).to.eq('ONE');
        });

        it('bar should be one', () => {
          expect(d.bar).to.eq('one');
        });

        it('qux should be TWO', () => {
          expect(d.qux).to.eq('TWO');
        });

        it('baz should be two', () => {
          expect(d.baz).to.eq('two');
        });
      });

      describe('Update', () => {
        before('Run', async() => {
          await d.update({foo: 'THREE', qux: 'FOUR'});
          d2 = <BaseDoc>await model.findById(d._id);
        });

        it('foo should be THREE', () => {
          expect(d2.foo).to.eq('THREE');
        });

        it('bar should be three', () => {
          expect(d2.bar).to.eq('three');
        });

        it('qux should be FOUR', () => {
          expect(d2.qux).to.eq('FOUR');
        });

        it('baz should be four', () => {
          expect(d2.baz).to.eq('four');
        });
      });
    });

    describe('With 2 fields', () => {
      before('init', async() => {
        const sch = new Schema(
          {
            bar: String,
            foo: String
          },
          {skipVersioning: true, versionKey: false}
        );

        MongooseTransformFieldPlugin.normalise(sch, 'foo', 'bar');
        model = mongoose.model<BaseDoc>(v4(), sch);
      });

      beforeEach('Create', async() => {
        d = await model.create({foo: 'QUX'});
      });

      describe('Save', () => {
        it('foo should be QUX', () => {
          expect(d.foo).to.eq('QUX');
        });

        it('bar should be qux', () => {
          expect(d.bar).to.eq('qux');
        });
      });

      describe('Update', () => {
        before('Run', async() => {
          await d.update({foo: 'BAR'});
          d2 = <BaseDoc>await model.findById(d._id);
        });

        it('foo should be BAR', () => {
          expect(d2.foo).to.eq('BAR');
        });

        it('bar should be bar', () => {
          expect(d2.bar).to.eq('bar');
        });
      });

      describe('findAndUpdate', () => {
        before('Run', async() => {
          await d.update({foo: 'BAR'});
          d2 = <BaseDoc>await model.findById(d._id);
        });

        it('foo should be BAR', () => {
          expect(d2.foo).to.eq('BAR');
        });

        it('bar should be bar', () => {
          expect(d2.bar).to.eq('bar');
        });
      });
    });
  });
});
