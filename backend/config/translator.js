import constant from "./constant.js";

// Reads the stored Gujarati / Hindi copies of content typed by people (event / notice titles, descriptions,
// venues…) from the content_translations table. Nothing calls an outside translation service: the rows are
// stored in the database, and when a language has no row the original text is shown.

const { TRANSLATABLE, TRANSLATION_LANGUAGES } = constant;

/**
 * SQL that puts the user's language in place of the original columns, for list queries:
 *   ${translatedColumns("event", "e", lang)} → "COALESCE(tr.t->>'title', e.title) AS title, …"
 *   ${translationJoin("event", "e", lang)}   → the LEFT JOIN that loads tr.t (one JSON object per row)
 * For the stored language (English) or the executive view both give the plain columns / nothing.
 * `lang` is always one of constant.LANGUAGES (checked by extractHeaderLanguage), so it is safe to inline
 */
const translates = (lang) => lang && lang !== constant.DEFAULT_LANGUAGE && TRANSLATION_LANGUAGES.includes(lang);

export const translatedColumns = (entityType, alias, lang) =>
    TRANSLATABLE[entityType].fields
        .map((f) => (translates(lang) ? `COALESCE(tr.t->>'${f}', ${alias}.${f}) AS ${f}` : `${alias}.${f}`))
        .join(", ");

export const translationJoin = (entityType, alias, lang) =>
    translates(lang)
        ? `LEFT JOIN LATERAL (
              SELECT jsonb_object_agg(c.field, c.value) AS t FROM content_translations c
              WHERE c.entity_type = '${entityType}' AND c.entity_id = ${alias}.id AND c.lang = '${lang}'
           ) tr ON TRUE`
        : "";

export default { translatedColumns, translationJoin };
