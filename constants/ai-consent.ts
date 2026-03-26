/**
 * AI Consent versioning (Apple Guideline 5.1.2(i)).
 *
 * Bump CURRENT_AI_CONSENT_VERSION whenever:
 * - The AI provider changes (e.g., switching from Anthropic to another provider)
 * - The data sent to the AI changes significantly
 * - The processing terms change materially
 *
 * When the version is bumped, users will be re-prompted for consent
 * before they can send new messages.
 */
export const CURRENT_AI_CONSENT_VERSION = 1;

/**
 * Human-readable description of what changed in each version.
 * Used in the re-consent UI to explain why we're asking again.
 */
export const AI_CONSENT_CHANGELOG: Record<number, string> = {
  1: "Initial AI disclosure: Anthropic Claude via OpenRouter",
};
