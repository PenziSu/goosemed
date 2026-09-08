type ConsoleMethod = (...args: unknown[]) => void;

type ConsoleOutput = {
  debug: ConsoleMethod;
  error: ConsoleMethod;
  info: ConsoleMethod;
  log: ConsoleMethod;
  warn: ConsoleMethod;
};

const discard = (..._args: unknown[]): void => {};

export function disableConsoleOutput(target: ConsoleOutput = console): void {
  target.debug = discard;
  target.error = discard;
  target.info = discard;
  target.log = discard;
  target.warn = discard;
}
