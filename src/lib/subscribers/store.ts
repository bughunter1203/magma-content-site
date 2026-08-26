export interface SubscriberStore {
  add(email: string): Promise<{ email: string; inserted: boolean }>;
}
