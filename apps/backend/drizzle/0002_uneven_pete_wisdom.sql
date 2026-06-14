CREATE TYPE "public"."field_data_type" AS ENUM('text', 'long_text', 'number', 'decimal', 'boolean', 'date', 'datetime', 'email', 'phone', 'url', 'picklist', 'lookup');--> statement-breakpoint
CREATE TABLE "object_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"api_name" text NOT NULL,
	"name" text NOT NULL,
	"plural_name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_definition_id" uuid NOT NULL,
	"api_key" text NOT NULL,
	"name" text NOT NULL,
	"data_type" "field_data_type" NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_unique" boolean DEFAULT false NOT NULL,
	"is_searchable" boolean DEFAULT false NOT NULL,
	"is_read_only" boolean DEFAULT false NOT NULL,
	"default_value" jsonb,
	"options" jsonb,
	"lookup_object_definition_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"object_definition_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "object_definitions" ADD CONSTRAINT "object_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_object_definition_id_object_definitions_id_fk" FOREIGN KEY ("object_definition_id") REFERENCES "public"."object_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_lookup_object_definition_id_object_definitions_id_fk" FOREIGN KEY ("lookup_object_definition_id") REFERENCES "public"."object_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_object_definition_id_object_definitions_id_fk" FOREIGN KEY ("object_definition_id") REFERENCES "public"."object_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "object_definitions_org_api_name_idx" ON "object_definitions" USING btree ("organization_id","api_name");--> statement-breakpoint
CREATE UNIQUE INDEX "field_definitions_object_api_key_idx" ON "field_definitions" USING btree ("object_definition_id","api_key");--> statement-breakpoint
CREATE INDEX "records_org_object_idx" ON "records" USING btree ("organization_id","object_definition_id");