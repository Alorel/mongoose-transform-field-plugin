import {Schema} from 'mongoose';
import {transformSyncInternal} from './_transformSyncInternal';

function normaliseTransformFn(inp: string): string {
  return inp.toLowerCase();
}

export = function(schema: Schema, sourceField: string, targetField: string, ...fields: string[]): void {
  fields = [sourceField, targetField].concat(fields);

  //tslint:disable-next-line:no-magic-numbers
  if (fields.length % 2 !== 0) {
    throw new TypeError('The number of fields must be even');
  }

  //tslint:disable-next-line:no-magic-numbers
  for (let i = 0; i < fields.length; i += 2) {
    transformSyncInternal(
      schema,
      fields[i],
      fields[i + 1],
      normaliseTransformFn
    );
  }
};
