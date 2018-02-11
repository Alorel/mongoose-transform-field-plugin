import {Thenable} from './Thenable';

/** A synchronous transformation function */
export type SyncTransform<T = any> = (val: T) => T;
/** An asynchronous transformation function */
export type AsyncTransform<T = any> = (val: T) => Thenable<T>;
