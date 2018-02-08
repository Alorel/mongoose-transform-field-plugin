import normalise = require('./normalise');
import transformAsync = require('./transformAsync');
import transformSync = require('./transformSync');

export interface Plugin {
  readonly normalise: typeof normalise;
  readonly transformAsync: typeof transformAsync;
  readonly transformSync: typeof transformSync;
}

//tslint:disable:variable-name no-var-requires
export const MongooseTransformFieldPlugin: Plugin = <any>{};

for (const name of ['normalise', 'transformAsync', 'transformSync']) {
  Object.defineProperty(MongooseTransformFieldPlugin, name, {
    configurable: true,
    get() {
      const value: any = require(`./${name}`);
      Object.defineProperty(MongooseTransformFieldPlugin, name, {value});

      return value;
    }
  });
}
