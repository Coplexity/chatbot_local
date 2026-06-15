import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export class PrefixedSnakeNamingStrategy extends SnakeNamingStrategy {
  private readonly prefix = "chat_";

  // Define the tables name to exclude from prefixing
  private readonly excludedTables = ["users"];

  override tableName(className: string, customName: string): string {
    const baseName = super.tableName(className, customName);

    if (this.excludedTables.includes(baseName)) {
      return baseName;
    }

    if (baseName.startsWith(this.prefix)) {
      return baseName;
    }

    return `${this.prefix}${baseName}`;
  }
}
