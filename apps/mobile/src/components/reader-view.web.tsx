import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

import type { ReaderHandle, ReaderViewProps } from './reader-view';

export type { ReaderHandle, ReaderViewProps } from './reader-view';

/** Web preview: same reader document inside an iframe. */
export const ReaderView = forwardRef<ReaderHandle, ReaderViewProps>(function ReaderView(
  { html, background, onProgress },
  ref,
) {
  const frame = useRef<HTMLIFrameElement | null>(null);

  useImperativeHandle(ref, () => ({
    scrollTo: (id: string) => {
      const win = frame.current?.contentWindow as (Window & { pmScrollTo?: (id: string) => void }) | null;
      win?.pmScrollTo?.(id);
    },
  }));

  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const msg = e.data as { source?: string; type?: string; value?: number };
      if (msg?.source === 'pm-reader' && msg.type === 'progress' && typeof msg.value === 'number') {
        onProgress?.(msg.value);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [onProgress]);

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <iframe
        ref={frame}
        title="Reader"
        srcDoc={html}
        sandbox="allow-scripts allow-popups"
        style={{ border: 0, width: '100%', height: '100%', backgroundColor: background }}
      />
    </View>
  );
});
