export class ApiError extends Error {

  stringCode: string | undefined;
  responseCode: number | undefined;

  constructor(stringCode: string | undefined, responseCode: number | undefined) {
    super();
    this.name = "ApiError";

    this.stringCode = stringCode;
    this.responseCode = responseCode;
  }

  get message() {
    return `${this.stringCode || ''} ${this.responseCode || ''}`;
  }

};
