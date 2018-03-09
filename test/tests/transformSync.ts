import {ObjectID} from 'bson';
import {expect} from 'chai';
import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import {Model, Schema} from 'mongoose';
import {v4} from 'uuid';
import {MongooseTransformFieldPlugin} from '../../src/index';
import {TransformSyncOptions} from '../../src/transformSync';
import {SyncTransform} from '../../types/Transform';
import {BaseDoc} from '../bootstrap';

describe('transformSync', () => {
  let model: Model<BaseDoc>;
  let d: BaseDoc;

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
            f = await model.findOneAndUpdate({_id}, upd, {upsert: true, new: true});
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
