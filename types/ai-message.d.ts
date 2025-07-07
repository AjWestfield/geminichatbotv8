import 'ai'

declare module 'ai' {
  interface Message {
    /** Optional metadata including generation details, search results, etc. */
    metadata?: Record<string, unknown>
  }

  interface CreateMessage {
    /** Optional metadata attached when creating a message */
    metadata?: Record<string, unknown>
  }
}
