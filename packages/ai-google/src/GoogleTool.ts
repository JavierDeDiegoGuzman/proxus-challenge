export interface GoogleSearchOptions {
  readonly dynamicRetrievalConfig?: unknown;
}

export const googleSearch = (options: GoogleSearchOptions = {}) => ({
  googleSearch: options
});

export const codeExecution = () => ({
  codeExecution: {}
});
