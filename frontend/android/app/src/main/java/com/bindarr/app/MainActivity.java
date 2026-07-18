package com.bindarr.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Android 15+/16 force edge-to-edge with no opt-out, and the WebView does not
    // populate env(safe-area-inset-*), so web content drew under the status bar.
    // Read the real system-bar insets and expose them to CSS as --sat/--sab/--sal/
    // --sar (in CSS px). The WebView stays full-screen/transparent so the themed
    // page background fills behind the status bar; the CSS just pads content by
    // these vars (see index.css max(env(...), var(--sa*))).
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final WebView web = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            float d = getResources().getDisplayMetrics().density;
            final int top = (int) (bars.top / d);
            final int bottom = (int) (bars.bottom / d);
            final int left = (int) (bars.left / d);
            final int right = (int) (bars.right / d);
            final String js = "(function(){var s=document.documentElement.style;"
                + "s.setProperty('--sat','" + top + "px');"
                + "s.setProperty('--sab','" + bottom + "px');"
                + "s.setProperty('--sal','" + left + "px');"
                + "s.setProperty('--sar','" + right + "px');})();";
            v.post(() -> web.evaluateJavascript(js, null));
            return insets;
        });
        ViewCompat.requestApplyInsets(web);
    }
}
