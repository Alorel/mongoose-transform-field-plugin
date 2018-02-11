import {LazyGetter} from 'typescript-lazy-get-decorator';
import normalise = require('./normalise');
import transformAsync = require('./transformAsync');
import transformSync = require('./transformSync');

//tslint:disable:no-var-requires
export class MongooseTransformFieldPlugin {

  @LazyGetter()
  public static get normalise(): typeof normalise {
    return require('./normalise');
  }

  @LazyGetter()
  public static get transformAsync(): typeof transformAsync {
    return require('./transformAsync');
  }

  @LazyGetter()
  public static get transformSync(): typeof transformSync {
    return require('./transformSync');
  }
}
