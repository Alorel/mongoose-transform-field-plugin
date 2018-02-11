import {LazyGetter} from 'typescript-lazy-get-decorator';
import normalise = require('./normalise');
import transformAsync = require('./transformAsync');
import transformSync = require('./transformSync');

//tslint:disable:no-var-requires
/**
 * A Mongoose field transformation plugin
 */
export class MongooseTransformFieldPlugin {

  /**
   * Normalise source fields into target fields. The target field values will be trimmed, lowercased and have their
   * accented characters converted to base latin ones.
   */
  @LazyGetter()
  public static get normalise(): typeof normalise {
    return require('./normalise');
  }

  /** Perform an asynchronous transformation on the given field */
  @LazyGetter()
  public static get transformAsync(): typeof transformAsync {
    return require('./transformAsync');
  }

  /** Perform a synchronous transformation on the given field */
  @LazyGetter()
  public static get transformSync(): typeof transformSync {
    return require('./transformSync');
  }
}
