import * as mongoose from 'mongoose';

export interface Base {
  bar: string;
  baz: string;
  foo: string;
  qux: string;
}

export interface BaseDoc extends Base, mongoose.Document {
}

before('Connect', () => {
  const connStr = <string>process.env.MONGODB_URL || `mongodb://127.0.0.1/mongoose-transform-field-test`;
  const opts: any = {};

  (<any>mongoose).Promise = Promise;

  return <any>mongoose.connect(connStr, opts);
});
