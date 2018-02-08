//tslint:disable:no-duplicate-imports
import {expect} from 'chai';
import * as dotenv from 'dotenv';
import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import {Document, Model, Schema} from 'mongoose';
import * as path from 'path';
import v4 = require('uuid/v4');
import {AsyncTransform, MongooseTransformFieldPlugin, SyncTransform} from './plugin';

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

  before('Load env', () => {
    const env = dotenv.config({
      path: path.join(__dirname, '.env')
    });

    if (!env.error) {
      Object.assign(process.env, env.parsed);
    }
  });

  before('Connect', () => {
    const connStr = <string>process.env.MONGODB_URL || `mongodb://127.0.0.1/mongoose-transform-field-test`;
    const opts: any = {};

    (<any>mongoose).Promise = Promise;

    if ((mongoose.version || '').charAt(0) === '4') {
      opts.useMongoClient = true;
    }

    return mongoose.connect(connStr, opts);
  });

  describe('promiseLibrary', () => {
    let original: any;

    before('Back up original', () => {
      original = MongooseTransformFieldPlugin['promise'];
    });

    after('Reset original', () => {
      MongooseTransformFieldPlugin['promise'] = original;
    });

    it('Should set the value', () => {
      MongooseTransformFieldPlugin.promiseLibrary = 'foo';
      expect(MongooseTransformFieldPlugin['promise']).to.eq('foo');
    });
  });

  describe('transformSync', () => {
    before('init', () => {
      const sch = new Schema(
        {
          foo: String
        },
        {skipVersioning: true, versionKey: false}
      );
      const transformer: SyncTransform<string> = (f: string): string => f.toLowerCase();
      MongooseTransformFieldPlugin.transformSync(
        sch,
        'foo',
        transformer
      );
      model = mongoose.model<BaseDoc>(v4(), sch);
    });

    beforeEach('Create', async() => {
      d = await model.create({foo: 'QUX'});
    });

    it('Should apply on save', () => {
      expect(d.foo).to.eq('qux');
    });

    it('Should apply on update', async() => {
      await d.update({foo: 'BAR'});
      d = <BaseDoc>await model.findById(d._id);
      expect(d.foo).to.eq('bar');
    });

    it('Should apply on findAndUpdate', async() => {
      await model.findByIdAndUpdate(d._id, {foo: 'BAR'});
      d = <BaseDoc>await model.findById(d._id);
      expect(d.foo).to.eq('bar');
    });
  });

  describe('transformAsync', () => {
    const transformer: AsyncTransform<string> = (f: string): Promise<string> => Promise.resolve(f.toLowerCase());

    const sigs = {
      explicitlyParallel: [true, transformer],
      explicitlyUnparallel: [false, transformer],
      implicitlyUnparallel: [transformer]
    };

    _.forEach(sigs, (signature: any[], suite: string): void => {
      describe(suite, () => {
        before('init', () => {
          const sch = new Schema(
            {
              foo: String
            },
            {skipVersioning: true, versionKey: false}
          );

          signature = [sch, 'foo'].concat(signature);
          MongooseTransformFieldPlugin.transformAsync.apply(null, signature);

          model = mongoose.model<BaseDoc>(v4(), sch);
        });

        beforeEach('Create', async() => {
          d = await model.create({foo: 'QUX'});
        });

        it('Should apply on save', () => {
          expect(d.foo).to.eq('qux');
        });

        it('Should apply on update', async() => {
          await d.update({foo: 'BAR'});
          d = <BaseDoc>await model.findById(d._id);
          expect(d.foo).to.eq('bar');
        });

        it('Should apply on findAndUpdate', async() => {
          await model.findByIdAndUpdate(d._id, {foo: 'BAR'});
          d = <BaseDoc>await model.findById(d._id);
          expect(d.foo).to.eq('bar');
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
