export function wrap<
  Args extends unknown[],
  Return,
>(
  fn:      (...args: Args) => Return,
  wrapper: (...args: Args) => Return,
  ...args: Args
): Return {
  fn(...args);
  return wrapper(...args);
}
