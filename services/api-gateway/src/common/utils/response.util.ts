export class ResponseUtil {
  static success<T>(
    data: T,
    message: string,
    meta?: Record<string, unknown>,
  ): {
    success: boolean;
    data: T;
    message: string;
    meta: Record<string, unknown>;
  } {
    return {
      success: true,
      data,
      message,
      meta: meta || this.buildSingleMeta(),
    };
  }

  static error(
    message: string,
    error?: string,
  ): {
    success: boolean;
    data: null;
    message: string;
    error?: string;
  } {
    return {
      success: false,
      data: null,
      message,
      ...(error && { error }),
    };
  }

  static buildSingleMeta(): Record<string, unknown> {
    return {
      total: 1,
      limit: 1,
      page: 1,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    };
  }

  static buildPaginationMeta(
    total: number,
    limit: number,
    page: number,
  ): Record<string, unknown> {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      limit,
      page,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    };
  }
}
