/** A scan saved on the device because it could not be analyzed yet (e.g. offline). */
export interface ScanQueueItem {
  id: string;
  frontImage: string;
  backImage: string | null;
  timestamp: number;
  /** pending = wartend, failed = fehlgeschlagen (see CONTEXT.md). */
  status: 'pending' | 'processing' | 'failed';
}
