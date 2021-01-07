export interface MockData {
  url: string;
  /**
   * http status code
   */
  httpCode?: number;
  /**
   * delay time
   */
  timeout?: number;
  /**
   * response body
   */
  response: Record<string, any>;
}
