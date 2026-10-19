import { GENERATED_DOCUMENTS } from './documents.generated';

/**
 * The legal and policy documents a school reads under Legal & Policies —
 * the same ones, with the same text, as the website's (copied by
 * `npm run sync-legal`). `group`: 'legal' = agreements and privacy,
 * 'trust' = security and data handling.
 */
export const SCHOOL_DOCUMENTS = GENERATED_DOCUMENTS;

/** A document's "Last updated" (or "Version") date, read from its text. */
const updatedOf = (source: string) => /\*\*(?:Last updated|Version):\*\*\s*([^\n·]+)/.exec(source)?.[1].trim() ?? null;

/** What a school confirms it has read: every document with its date. Same as the website's. */
export const POLICY_DOCUMENTS = SCHOOL_DOCUMENTS.map(doc => ({ slug: doc.slug, title: doc.title, updated: updatedOf(doc.source) }));
/** Changes whenever a document's date changes, so schools are asked to confirm again. Same rule as the website's. */
export const POLICIES_VERSION = POLICY_DOCUMENTS.map(doc => `${doc.slug}:${doc.updated ?? ''}`).join('|');
