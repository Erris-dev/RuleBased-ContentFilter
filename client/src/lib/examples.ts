/**
 * The brief's sample sentence, used as the textarea's starting content and as
 * its placeholder.
 *
 * This is presentation, so it lives on the client. The example *rules* do not —
 * they are seeded by `POST /api/rules/examples` from the server's own
 * definition, so there is one path into the database (plan §5).
 */
export const EXAMPLE_TEXT =
  'The meeting with the finance team is tomorrow. The deadline is urgent.';
