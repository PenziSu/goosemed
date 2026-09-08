const discard = (..._args: unknown[]): void => {};

const log = {
  debug: discard,
  info: discard,
  warn: discard,
  error: discard,
};

export default log;
