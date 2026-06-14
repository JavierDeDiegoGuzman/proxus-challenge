export interface Part {
  readonly text?: string;
  readonly inlineData?: {
    readonly mimeType: string;
    readonly data: string;
  };
}

export interface Content {
  readonly role?: "user" | "model" | "system";
  readonly parts: ReadonlyArray<Part>;
}

export interface GenerationConfig {
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxOutputTokens?: number;
  readonly stopSequences?: ReadonlyArray<string>;
  readonly responseMimeType?: string;
  readonly responseSchema?: unknown;
}

export interface GenerateContentRequest {
  readonly contents: ReadonlyArray<Content>;
  readonly systemInstruction?: Content;
  readonly generationConfig?: GenerationConfig;
  readonly tools?: ReadonlyArray<unknown>;
  readonly toolConfig?: unknown;
}

export interface Candidate {
  readonly content?: Content;
  readonly finishReason?: string;
  readonly index?: number;
  readonly safetyRatings?: ReadonlyArray<unknown>;
}

export interface UsageMetadata {
  readonly promptTokenCount?: number;
  readonly candidatesTokenCount?: number;
  readonly totalTokenCount?: number;
}

export interface GenerateContentResponse {
  readonly candidates?: ReadonlyArray<Candidate>;
  readonly usageMetadata?: UsageMetadata;
  readonly modelVersion?: string;
}
