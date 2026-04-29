import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class DatabaseSchemaService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSchemaService.name);

  constructor(private readonly dataSource: DataSource) { }

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureBackendSchema();
  }

  private async ensureBackendSchema(): Promise<void> {
    await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_accounts_provider_enum') THEN
          CREATE TYPE chat_accounts_provider_enum AS ENUM ('google', 'github');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_messages_role_enum') THEN
          CREATE TYPE chat_messages_role_enum AS ENUM ('user', 'assistant', 'system');
        END IF;
      END $$;
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        document_user_id bigint UNIQUE,
        full_name varchar(255),
        email varchar(255) NOT NULL UNIQUE,
        role varchar(50) NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_chat_users_document_user
          FOREIGN KEY (document_user_id) REFERENCES users(user_id)
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
        provider chat_accounts_provider_enum NOT NULL,
        provider_account_id varchar,
        access_token text,
        refresh_token text,
        expires_at timestamptz,
        id_token text,
        token_type varchar,
        scope text,
        profile json,
        metadata json,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title varchar(255),
        user_id uuid NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
        total_tokens int NOT NULL DEFAULT 0,
        max_tokens int NOT NULL DEFAULT 4000,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamp
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        role chat_messages_role_enum NOT NULL,
        content text NOT NULL,
        token_count int NOT NULL DEFAULT 0,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_conversation_summaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        summary text NOT NULL,
        summarized_messages_count int NOT NULL,
        token_count int NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS chat_citations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        chuong int,
        dieu int,
        khoan int,
        phu_luc int,
        noi_dung_da_su_dung text,
        start_char int NOT NULL,
        end_char int NOT NULL,
        resource_type varchar(50),
        resource_content text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await this.createIndexes();
    this.logger.log("Backend-owned chat schema is ready");
  }

  private async createIndexes(): Promise<void> {
    const indexes = [
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_accounts_provider_provider_account_id ON chat_accounts(provider, provider_account_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_accounts_user_id ON chat_accounts(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id_created_at ON chat_conversations(user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id_deleted_at ON chat_conversations(user_id, deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_created_at ON chat_messages(conversation_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_messages_role_created_at ON chat_messages(role, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_conversation_summaries_conversation_id_created_at ON chat_conversation_summaries(conversation_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_citations_message_id_created_at ON chat_citations(message_id, created_at)`,
    ];

    for (const indexSql of indexes) {
      await this.dataSource.query(indexSql);
    }
  }
}
