/**
 * Represents the completion of an asynchronous operation
 */
export interface Thenable<T> {
  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param reject The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of the callback.
   */
  catch<TRes = never>(reject?: ((why: any) => TRes | PromiseLike<TRes>) | undefined | null): Thenable<T | TRes>;

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param ok The callback to execute when the Promise is resolved.
   * @param err The callback to execute when the Promise is rejected.
   * @returns A Promise for the completion of which ever callback is executed.
   */
  then<R1 = T, R2 = never>(ok?: ((value: T) => R1 | PromiseLike<R1>) | undefined | null,
                           err?: ((why: any) => R2 | PromiseLike<R2>) | undefined | null): Thenable<R1 | R2>;
}
