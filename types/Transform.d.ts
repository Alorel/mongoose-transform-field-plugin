import {Thenable} from './Thenable';

export type SyncTransform<T = any> = (val: T) => T;
export type AsyncTransform<T = any> = (val: T) => Thenable<T>;
