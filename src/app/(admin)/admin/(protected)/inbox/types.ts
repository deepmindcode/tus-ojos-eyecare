/**
 * src/app/(admin)/admin/(protected)/inbox/types.ts
 *
 * Los tipos viven aparte: un modulo "use server" solo debe exportar
 * funciones async, y la lista es un componente de cliente.
 */

export type MessageStatus =
  | "UNREAD"
  | "READ"
  | "IN_PROGRESS"
  | "REPLIED"
  | "CLOSED"
  | "SPAM";

export interface MessageRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly city: string;
  readonly subject: string;
  readonly message: string;
  readonly status: MessageStatus;
  readonly createdAt: string;
  /** Lleva mas de 24 h sin que nadie lo abra */
  readonly stale: boolean;
}