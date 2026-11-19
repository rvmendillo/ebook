import { forwardRef, useImperativeHandle, useRef, type ComponentType, type Ref } from 'react';
import { Linking, Platform, StyleSheet } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

interface WebViewHandle {
  injectJavaScript: (script: string) => void;
}

// react-native-webview's class typings resolve to `never` props under React 19 types; re-type it.
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export interface ReaderHandle {
  scrollTo: (headingId: string) => void;
}

export interface ReaderViewProps {
  html: string;
  background: string;
  onProgress?: (p: number) => void;
  scrollEnabled?: boolean;
}

/** Renders a reader document (see shared/reader.ts) in a WebView. */
export const ReaderView = forwardRef<ReaderHandle, ReaderViewProps>(function ReaderView(
  { html, background, onProgress, scrollEnabled = true },
  ref,
) {
  const web = useRef<WebViewHandle>(null);

  useImperativeHandle(ref, () => ({
    scrollTo: (id: string) => web.current?.injectJavaScript(`window.pmScrollTo(${JSON.stringify(id)}); true;`),
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; value?: number };
      if (msg.type === 'progress' && typeof msg.value === 'number') onProgress?.(msg.value);
    } catch {
      // ignore
    }
  };

  return (
    <WebView
      ref={web}
      source={{ html, baseUrl: '' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      style={[styles.web, { backgroundColor: background }]}
      containerStyle={{ backgroundColor: background }}
      scrollEnabled={scrollEnabled}
      javaScriptEnabled
      setSupportMultipleWindows={false}
      allowsLinkPreview={false}
      allowsInlineMediaPlayback
      textZoom={100}
      decelerationRate="normal"
      showsVerticalScrollIndicator={false}
      onShouldStartLoadWithRequest={(req) => {
        // Let embedded iframes (videos) load; open tapped links in the browser.
        if (Platform.OS === 'ios' && req.isTopFrame === false) return true;
        if (/^https?:|^mailto:|^tel:/i.test(req.url)) {
          void Linking.openURL(req.url);
          return false;
        }
        return true;
      }}
    />
  );
});

const styles = StyleSheet.create({
  web: { flex: 1 },
});
