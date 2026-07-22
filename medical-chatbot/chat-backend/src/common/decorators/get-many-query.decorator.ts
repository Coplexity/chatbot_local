import { applyDecorators } from "@nestjs/common";
import { ApiQuery, ApiQueryOptions } from "@nestjs/swagger";

// Assuming you have these constants defined and exported, e.g., from './shared/constants'
// If not, you can define them directly here or replace with hardcoded strings.
export const CRUD_QUERY_NAMES = {
  fields: "fields",
  search: "s",
  filter: "filter",
  or: "or",
  join: "join",
  sort: "sort",
  limit: "limit",
  offset: "offset",
  page: "page",
  cache: "cache",
  includeDeleted: "includeDeleted",
};

// Helper for documentation links (optional, improves consistency)
const docsLink = (anchor: string) => `<a href="https://github.com/nestjsx/crud/wiki/Requests#${anchor}" target="_blank">Docs</a>`;

// Define an options interface for better type checking and extensibility
interface ApiCrudQueriesOptions {
  /** Set to true if your endpoint supports soft-delete and you want to document the includeDeleted parameter */
  includeDeleted?: boolean;
  // You could add more options here later if needed, e.g., overriding specific descriptions
}

/**
 * Applies standard ApiQuery decorators for nestjsx/crud GET many endpoints.
 * Includes documentation for: fields, search, filter, or, sort, join, limit, offset, page, cache.
 * Optionally includes 'includeDeleted' if options.includeDeleted is true.
 *
 * @param options - Optional configuration for the decorator.
 */
export function CrudGetManyQueries(options?: ApiCrudQueriesOptions) {
  // Define the metadata for all base query parameters
  const baseQueryMetadata: ApiQueryOptions[] = [
    {
      name: CRUD_QUERY_NAMES.fields,
      description: `Selects resource fields. ${docsLink("select")}`,
      required: false,
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: false,
    },
    {
      name: CRUD_QUERY_NAMES.search,
      description: `Adds search condition (JSON format expected for complex queries). ${docsLink("search")}`,
      required: false,
      schema: { type: "string" },
    },
    {
      name: CRUD_QUERY_NAMES.filter,
      description: `Adds filter condition. ${docsLink("filter")}`,
      required: false,
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    },
    {
      name: CRUD_QUERY_NAMES.or,
      description: `Adds OR condition. ${docsLink("or")}`,
      required: false,
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    },
    {
      name: CRUD_QUERY_NAMES.sort,
      description: `Adds sort condition. ${docsLink("sort")}`,
      required: false,
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    },
    {
      name: CRUD_QUERY_NAMES.join,
      description: `Adds relational resources. ${docsLink("join")}`,
      required: false,
      schema: { type: "array", items: { type: "string" } },
      style: "form",
      explode: true,
    },
    {
      name: CRUD_QUERY_NAMES.limit,
      description: `Limit returned resources. ${docsLink("limit")}`,
      required: false,
      schema: { type: "integer" },
    },
    {
      name: CRUD_QUERY_NAMES.offset,
      description: `Offset returned resources. ${docsLink("offset")}`,
      required: false,
      schema: { type: "integer" },
    },
    {
      name: CRUD_QUERY_NAMES.page,
      description: `Page portion of returned resources. ${docsLink("page")}`,
      required: false,
      schema: { type: "integer" },
    },
    {
      name: CRUD_QUERY_NAMES.cache,
      description: `Reset cache (if was enabled). Pass 1 to reset. ${docsLink("cache")}`,
      required: false,
      schema: { type: "integer" },
    },
  ];

  // Start with the base metadata
  const allQueryMetadata = [...baseQueryMetadata];

  // Conditionally add the 'includeDeleted' metadata
  if (options?.includeDeleted) {
    allQueryMetadata.push({
      name: CRUD_QUERY_NAMES.includeDeleted,
      description: `Include deleted resources (requires soft delete enabled). Pass 1 to include. ${docsLink("soft-delete")}`,
      required: false,
      schema: { type: "integer", enum: [0, 1] },
    });
  }

  // Use map to loop through the metadata and create ApiQuery decorators
  const decorators = allQueryMetadata.map(meta => ApiQuery(meta));

  // Apply all generated decorators
  return applyDecorators(...decorators);
}
