import type { ColumnOptions } from "typeorm";
import { Column } from "typeorm";

export function JsonColumn(options: ColumnOptions = {}): PropertyDecorator {
  return Column({
    type: "json",
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value),
    },
    ...options,
  });
}
