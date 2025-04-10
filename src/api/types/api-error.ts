export class ApiError extends Error {

  stringCode?: string;
  responseCode?: number;
  body?: any;

  constructor(stringCode?: string, responseCode?: number, body?: any) {
    super();
    this.name = "ApiError";

    this.stringCode = stringCode;
    this.responseCode = responseCode;

    if (body.title !== undefined) {
      this.body = body.title + Object.values(body.errors).map((error: any) => error.join('')).join(' ');
    } else {
      this.body = body || 'No additional information provided.';
    }
  }

  get message() {
    return this.body ? this.body : `${this.stringCode || ''} ${this.responseCode || ''}`;
  }

};
