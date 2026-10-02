/** Every configured model failed or is out of quota. The run can be resumed later. */
export class ProviderExhaustedError extends Error {
  readonly code = "providers_exhausted";
  constructor(message = "All free models are busy or out of quota. Your progress is saved. Resume later.") {
    super(message);
    this.name = "ProviderExhaustedError";
  }
}

/** An external data source failed after retries. The run can be resumed later. */
export class ToolUnavailableError extends Error {
  readonly code = "tool_unavailable";
  constructor(
    public readonly tool: string,
    message: string
  ) {
    super(message);
    this.name = "ToolUnavailableError";
  }
}

/** The request cannot be planned as given. Not resumable; the user must change it. */
export class RequestError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "RequestError";
  }
}

// Errors can cross the graph runtime, so identify them by name rather than
// by class identity.
const nameOf = (error: unknown) => (error as { name?: string } | null)?.name;

export const isResumable = (error: unknown): error is ProviderExhaustedError | ToolUnavailableError =>
  nameOf(error) === "ProviderExhaustedError" || nameOf(error) === "ToolUnavailableError";

export const isRequestError = (error: unknown): error is RequestError => nameOf(error) === "RequestError";
