// https://github.com/microsoft/TypeScript/blob/1d96eb489e559f4f61522edb3c8b5987bbe948af/src/harness/util.ts#L121

export interface Deferred<T> {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason: unknown) => void
  promise: Promise<T>
}

export function defer<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return { resolve, reject, promise }
}