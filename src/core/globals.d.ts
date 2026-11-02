/** Bridge fields written by the Chrome extension wrapper, absent in library mode. */
interface Window {
  __swarmShot?: string | null;
  __swarmHidden?: boolean;
  __swarmUnhide?: () => void;
  __swarmRebuild?: {
    start(): void;
    stop(reveal?: boolean): void;
    toggle(): void;
    readonly app: unknown;
    debug: unknown;
  };
}

/** Present only when the script runs inside the Chrome extension. */
declare const chrome:
  { runtime?: { sendMessage?: (msg: unknown) => Promise<unknown> } } | undefined;
