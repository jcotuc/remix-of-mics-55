export class TimeoutError extends Error {
  override name = "TimeoutError";
}

/**
 * Wrap a promise with a timeout so callers never hang indefinitely.
 * Note: this does NOT cancel the underlying operation; it only stops awaiting it.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(new TimeoutError(`Timeout (${label}) after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        window.clearTimeout(id);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(id);
        reject(err);
      });
  });
}
