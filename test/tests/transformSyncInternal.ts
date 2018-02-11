import {expect} from 'chai';
import {MongooseTransformFieldPlugin} from '../../src/index';

describe('transformSyncInternal', () => {
  it('Should throw if schema is not provided', () => {
    expect(() => MongooseTransformFieldPlugin.transformSync(<any>null, 'foo', (_x: string) => 'bar'))
      .to.throw(TypeError, 'Schema is required');
  });
});
