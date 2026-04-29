import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Interceptor to transform @dataui/crud pagination response format
 * to match our custom pagination convention
 *
 * Transforms:
 * FROM (CRUD default):
 * {
 *   data: [...],
 *   count: 100,
 *   total: 100,
 *   page: 1,
 *   pageCount: 10
 * }
 *
 * TO (Our convention):
 * {
 *   items: [...],
 *   pagination: {
 *     page: 1,
 *     pageSize: 10,
 *     totalItems: 100,
 *     totalPages: 10,
 *   }
 * }
 */
@Injectable()
export class CrudPaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        // Check if response is a CRUD paginated response
        if (this.isCrudPaginatedResponse(response)) {
          return this.transformCrudResponse(response);
        }

        // Return as-is if not a CRUD paginated response
        return response;
      }),
    );
  }

  /**
   * Check if response is a CRUD paginated response
   */
  private isCrudPaginatedResponse(response: any): boolean {
    return (
      response
      && typeof response === "object"
      && Array.isArray(response.data)
      && typeof response.page === "number"
      && typeof response.pageCount === "number"
    );
  }

  /**
   * Transform CRUD response to our pagination convention
   */
  private transformCrudResponse(crudResponse: any): any {
    const {
      data,
      count,
      total,
      page,
      pageCount,
    } = crudResponse;

    // Calculate page size from the data
    const pageSize = data.length > 0 ? Math.ceil((total || count) / pageCount) : 10;
    const totalItems = total || count || 0;
    const totalPages = pageCount || 0;

    return {
      items: data,
      pagination: {
        page: page || 1,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }
}
