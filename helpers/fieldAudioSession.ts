type FieldAudioSession = {
  id: number;
  pause: () => void | Promise<void>;
};

let activeSession: FieldAudioSession | null = null;

/** Ensure only one field-record audio plays at a time. */
export function claimFieldAudioPlayback(id: number, pause: () => void | Promise<void>): void {
  if (activeSession && activeSession.id !== id) {
    void Promise.resolve(activeSession.pause());
  }
  activeSession = { id, pause };
}

export function releaseFieldAudioPlayback(id: number): void {
  if (activeSession?.id === id) {
    activeSession = null;
  }
}
