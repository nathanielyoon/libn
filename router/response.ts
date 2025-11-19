/** @internal */
type BodyInit = ConstructorParameters<typeof Response>[0];
/** Response builder. */
export class Responser {
  private code?: number;
  private headers: Headers = new Headers();
  /** Sets the status code. */
  status(code: number): this {
    return this.code = code, this;
  }
  /** Sets a header, overwriting an existing one. */
  header(name: string, value: string): this {
    return this.headers.set(name, value), this;
  }
  /** Adds a header, appending to an existing one. */
  append(name: string, value: string): this {
    return this.headers.append(name, value), this;
  }
  /** Deletes a header. */
  delete(name: string): this {
    return this.headers.delete(name), this;
  }
  /** Builds a response. */
  build(body?: BodyInit): Response {
    return new Response(body, {
      status: this.code ?? 200,
      headers: this.headers,
    });
  }
  /** Creates a response with a body and content type. */
  body(body: BodyInit, type = "application/octet-stream"): Response {
    return this.header("content-type", type).build(body);
  }
  /** Creates a plain text response. */
  text(body: string): Response {
    return this.body(body, "text/plain;charset=UTF-8");
  }
  /** Creates an HTML response. */
  html(body: string): Response {
    return this.body(body, "text/html;charset=UTF-8");
  }
  /** Creates a JSON response. */
  json(body: any): Response {
    return this.body(JSON.stringify(body), "application/json;charset=UTF-8");
  }
  /** Creates a blob response. */
  blob(body: Blob): Response {
    return this.body(body, body.type || undefined);
  }
  /** Creates a redirect response. */
  redirect(location: string | URL): Response {
    this.code ??= 302;
    return this.header("location", new URL(location).href).build(null);
  }
  /** Creates an error response. */
  error(cause: unknown): Response {
    try {
      const err = cause instanceof Error ? cause : Error(`${cause}`, { cause });
      const json = JSON.stringify({
        name: err.name,
        message: err.message,
        cause: err.cause,
        stack: err.stack,
      }, (_, $) => typeof $ === "bigint" ? `0x${$.toString(16)}` : $);
      this.code ??= 500;
      return this.header("content-type", "application/json").build(json);
    } catch {
      return this.status(500).build(null);
    }
  }
}
