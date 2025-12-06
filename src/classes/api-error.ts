export class ApiError extends Error {
  stringCode?: string;
  responseCode?: number;
  body?: any;

  constructor(stringCode?: string, responseCode?: number, body?: any) {
    super();
    this.name = 'ApiError';

    this.stringCode = stringCode;
    this.responseCode = responseCode;

    if (body?.title !== undefined && body.errors !== undefined) {
      this.body =
        body.title +
        Object.values(body.errors)
          .map((error: any) => error.join(''))
          .join(' ');
    } else if (body?.title) {
      this.body = body.title;
    } else if (body) {
      this.body = body;
    }
  }

  // TODO: maybe google translate this, lmao
  override get message(): string {
    return this.body ?? `${this.stringCode ?? ''} ${this.responseCode ?? ''}`;
  }
}
