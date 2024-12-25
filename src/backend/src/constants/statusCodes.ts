/**
 * HTTP Status Codes enum for consistent usage across the application.
 * These status codes are used in API responses, error handling, and middleware components.
 * @version 1.0.0
 */
export enum HTTP_STATUS {
  /**
   * 200: Standard success response for HTTP requests
   * Used when the request has succeeded and data is being returned
   */
  OK = 200,

  /**
   * 201: Success response for resource creation
   * Used when a new resource has been successfully created
   */
  CREATED = 201,

  /**
   * 202: Request accepted for asynchronous processing
   * Used when the request has been accepted but processing is not complete
   */
  ACCEPTED = 202,

  /**
   * 204: Success response without content body
   * Used when the request succeeded but no content is returned
   */
  NO_CONTENT = 204,

  /**
   * 400: Invalid request parameters or format
   * Used when the request cannot be processed due to client error
   */
  BAD_REQUEST = 400,

  /**
   * 401: Authentication failure or invalid credentials
   * Used when authentication is required but has failed or not been provided
   */
  UNAUTHORIZED = 401,

  /**
   * 403: Authorization failure or insufficient permissions
   * Used when the client is authenticated but doesn't have permission
   */
  FORBIDDEN = 403,

  /**
   * 404: Requested resource not found
   * Used when the requested resource does not exist
   */
  NOT_FOUND = 404,

  /**
   * 409: Resource conflict or duplicate entry
   * Used when the request conflicts with current state of the server
   */
  CONFLICT = 409,

  /**
   * 422: Validation failure or business logic error
   * Used when the request is well-formed but contains invalid data
   */
  UNPROCESSABLE_ENTITY = 422,

  /**
   * 429: Rate limit exceeded
   * Used when the user has sent too many requests in a given time period
   */
  TOO_MANY_REQUESTS = 429,

  /**
   * 500: Unexpected server error
   * Used when an unexpected condition was encountered on the server
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * 503: Service temporarily unavailable or maintenance
   * Used when the server is temporarily unable to handle the request
   */
  SERVICE_UNAVAILABLE = 503
}