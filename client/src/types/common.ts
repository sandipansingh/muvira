export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMetadata;
}

export interface StandardResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponseEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: any;
  };
}

export type ApiResponse<T> = StandardResponse<T> | ErrorResponseEnvelope;
export type ApiPaginatedResponse<T> = PaginatedResponse<T> | ErrorResponseEnvelope;
