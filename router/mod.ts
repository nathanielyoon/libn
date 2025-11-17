interface Hollow extends Request {
  readonly method: "GET" | "HEAD" | "CONNECT" | "TRACE";
  // No body in these requests.
  readonly body: never;
  readonly bodyUsed: false;
  readonly arrayBuffer: never;
  readonly blob: never;
  readonly bytes: never;
  readonly formData: never;
  readonly json: never;
  readonly text: never;
  // Clones to same type.
  readonly clone: () => Hollow;
}
interface Filled extends Request {
  readonly method: "POST" | "PUT" | "DELETE" | "OPTIONS" | "PATCH";
  // Clones to same type.
  readonly clone: () => Filled;
}
type Handled =
  | string
  | BufferSource
  | Iterable<Uint8Array>
  | AsyncIterable<Uint8Array>
  | ReadableStream<Uint8Array>
  | Blob
  | Response;
type Handler = (request: Hollow | Filled) => Handled | Promise<Handled>;
