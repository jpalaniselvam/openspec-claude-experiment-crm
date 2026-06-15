import { FieldDefinition } from '../admin/objects/fields.service';
import { ObjectDefinition } from '../admin/objects/objects.service';

const DISPLAY_FIELD_DATA_TYPES = new Set(['text', 'long_text']);

/**
 * Resolves the apiKey of the field used to display a human-readable label for a record of this object:
 * the explicit `displayFieldApiKey`, or the first `text`/`long_text` field by `sortOrder`, or `null`.
 * Mirrors the backend resolution rule in object-definition-service.ts.
 */
export function resolveEffectiveDisplayField(
  object: ObjectDefinition,
  fields: FieldDefinition[],
): string | null {
  if (object.displayFieldApiKey) {
    return object.displayFieldApiKey;
  }

  const candidates = fields
    .filter((field) => DISPLAY_FIELD_DATA_TYPES.has(field.dataType))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return candidates[0]?.apiKey ?? null;
}
