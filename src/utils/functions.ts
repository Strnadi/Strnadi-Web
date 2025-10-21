export function wrap<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
  wrapper: (...args: Args) => Return,
  ...args: Args
): Return {
  fn(...args);
  return wrapper(...args);
}

const makeLogged =
  (type: 'log' | 'info' | 'warn' | 'error') =>
  (...args: any[]) => {
    void Promise.all(args).then((resolved) => {
      console[type](...resolved);
    });

    return args;
  };

export const logged = makeLogged('log');
export const informed = makeLogged('info');
export const warned = makeLogged('warn');
export const errored = makeLogged('error');
