import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { records } from "../db/schema/index.js";
import { listFieldDefinitionsForObject } from "./field-definition-service.js";
import { buildRecordSchema } from "../validation/records.js";
import type { ObjectDefinitionDto } from "./object-definition-service.js";

export interface RecordDto {
  id: string;
  objectDefinitionId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateRecordResult = { ok: true; record: RecordDto } | { ok: false; code: "VALIDATION_ERROR"; message: string };

export type GetRecordResult = { ok: true; record: RecordDto } | { ok: false; code: "RECORD_NOT_FOUND"; message: string };

export type UpdateRecordResult =
  | { ok: true; record: RecordDto }
  | { ok: false; code: "VALIDATION_ERROR"; message: string }
  | { ok: false; code: "RECORD_NOT_FOUND"; message: string };

export type DeleteRecordResult = { ok: true } | { ok: false; code: "RECORD_NOT_FOUND"; message: string };

function toDto(row: typeof records.$inferSelect): RecordDto {
  return {
    id: row.id,
    objectDefinitionId: row.objectDefinitionId,
    data: row.data,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function validateData(organizationId: string, objectDefinitionId: string, data: unknown) {
  const fieldDefinitions = await listFieldDefinitionsForObject(objectDefinitionId);
  const schema = buildRecordSchema(organizationId, fieldDefinitions);
  return schema.safeParseAsync(data);
}

export async function listRecords(organizationId: string, object: ObjectDefinitionDto): Promise<RecordDto[]> {
  const rows = await db
    .select()
    .from(records)
    .where(and(eq(records.organizationId, organizationId), eq(records.objectDefinitionId, object.id)));

  return rows.map(toDto);
}

export async function createRecord(
  organizationId: string,
  object: ObjectDefinitionDto,
  data: unknown,
): Promise<CreateRecordResult> {
  const parsed = await validateData(organizationId, object.id, data);

  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid record data" };
  }

  const [created] = await db
    .insert(records)
    .values({ organizationId, objectDefinitionId: object.id, data: parsed.data as Record<string, unknown> })
    .returning();

  return { ok: true, record: toDto(created) };
}

export async function getRecord(organizationId: string, object: ObjectDefinitionDto, id: string): Promise<GetRecordResult> {
  const [row] = await db
    .select()
    .from(records)
    .where(and(eq(records.id, id), eq(records.organizationId, organizationId), eq(records.objectDefinitionId, object.id)))
    .limit(1);

  if (!row) {
    return { ok: false, code: "RECORD_NOT_FOUND", message: "Record not found" };
  }

  return { ok: true, record: toDto(row) };
}

export async function updateRecord(
  organizationId: string,
  object: ObjectDefinitionDto,
  id: string,
  data: unknown,
): Promise<UpdateRecordResult> {
  const existing = await getRecord(organizationId, object, id);
  if (!existing.ok) {
    return existing;
  }

  const parsed = await validateData(organizationId, object.id, data);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Invalid record data" };
  }

  const [updated] = await db
    .update(records)
    .set({ data: parsed.data as Record<string, unknown>, updatedAt: new Date() })
    .where(eq(records.id, id))
    .returning();

  return { ok: true, record: toDto(updated) };
}

export async function deleteRecord(organizationId: string, object: ObjectDefinitionDto, id: string): Promise<DeleteRecordResult> {
  const existing = await getRecord(organizationId, object, id);
  if (!existing.ok) {
    return existing;
  }

  await db.delete(records).where(eq(records.id, id));

  return { ok: true };
}
