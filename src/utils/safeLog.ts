type LogContext = string | Error | unknown;

function safeMessage(error: LogContext): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}

export function logSafeError(scope: string, error: LogContext) {
  if (__DEV__) {
    console.error(scope, error);
    return;
  }

  console.error(scope, safeMessage(error));
}

export function logSafeWarning(scope: string, error: LogContext) {
  if (__DEV__) {
    console.warn(scope, error);
    return;
  }

  console.warn(scope, safeMessage(error));
}
