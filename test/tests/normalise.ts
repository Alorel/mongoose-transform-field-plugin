import {expect} from 'chai';
import * as mongoose from 'mongoose';
import {Model, Schema} from 'mongoose';
import * as v4 from 'uuid/v4';
import {MongooseTransformFieldPlugin} from '../../src/index';
import {BaseDoc} from '../bootstrap';

describe('normalise', () => {
  let model: Model<BaseDoc>;
  let d: BaseDoc;
  let d2: BaseDoc;

  (() => {
    interface Thrower {
      name: string;
      sig: any[];
      thrown: any[];
    }

    const throwers: Thrower[] = [
      {
        name: 'schema is not provided',
        sig: [],
        thrown: [Error, 'Schema is required']
      },
      {
        name: 'fields are not provided',
        sig: [new Schema()],
        thrown: [Error, 'Fields are required']
      },
      {
        name: 'fields are empty',
        sig: [new Schema(), {}],
        thrown: [Error, 'At least one field pair is required']
      },
      {
        name: 'a source field is empty',
        sig: [new Schema(), {'': 'bar'}],
        thrown: [TypeError, 'Source field must be a non-empty string']
      },
      {
        name: 'a target field is empty',
        sig: [new Schema(), {x: ''}],
        thrown: [TypeError, 'Target field must be a non-empty string']
      },
      {
        name: 'a target field is not a string',
        sig: [new Schema(), {x: 1}],
        thrown: [TypeError, 'Target field must be a non-empty string']
      }
    ];

    for (const spec of throwers) {
      it(`Should throw if ${spec.name}`, () => {
        expect(() => MongooseTransformFieldPlugin.normalise.apply(null, spec.sig))
          .to.throw(...spec.thrown);
      });
    }
  })();

  describe('Should skip non-string input', () => {
    let doc: { foo: Number; bar: Number } & mongoose.Document;

    before('init', () => {
      const sch = new Schema({foo: Number, bar: Number}, {skipVersioning: true, versionKey: false});
      sch.plugin(MongooseTransformFieldPlugin.normalise.plugin, {foo: 'bar'});
      model = mongoose.model(v4(), sch);
    });

    before('create doc', async() => {
      doc = <any>await model.create(<any>{foo: 1});
    });

    it('foo should be 1', () => {
      expect(doc.foo).to.eq(1);
    });

    it('bar should be 1', () => {
      expect(doc.bar).to.eq(1);
    });
  });

  for (const variation of ['direct', 'plugin']) {
    describe(variation, () => {

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

          const spec = {foo: 'bar', qux: 'baz'};
          if (variation === 'direct') {
            MongooseTransformFieldPlugin.normalise(sch, spec);
          } else {
            sch.plugin(MongooseTransformFieldPlugin.normalise.plugin, spec);
          }

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

          const spec = {foo: 'bar'};
          if (variation === 'direct') {
            MongooseTransformFieldPlugin.normalise(sch, spec);
          } else {
            sch.plugin(MongooseTransformFieldPlugin.normalise.plugin, spec);
          }
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
  }
});
