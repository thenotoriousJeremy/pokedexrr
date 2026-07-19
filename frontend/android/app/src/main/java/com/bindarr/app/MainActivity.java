package com.bindarr.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Android 15+/16 force edge-to-edge with no opt-out, and the WebView does not
    // populate env(safe-area-inset-*), so web content drew under the status bar
    // and the bottom gesture bar. Read the real system-bar insets and expose them
    // to CSS as --sat/--sab/--sal/--sar (in CSS px); the page pads content by
    // these vars (see index.css max(env(...), var(--sa*))).
    private int satTop, satBottom, satLeft, satRight;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final WebView web = getBridge().getWebView();

        // Listen on the decor view so we read the FULL system-bar insets. A
        // listener on the WebView itself can see zeros if a parent consumed them.
        final View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            float d = getResources().getDisplayMetrics().density;
            satTop = (int) (bars.top / d);
            satBottom = (int) (bars.bottom / d);
            satLeft = (int) (bars.left / d);
            satRight = (int) (bars.right / d);
            injectInsets(web);
            return insets;
        });
        ViewCompat.requestApplyInsets(decor);

        // Insets usually resolve before the web bundle has mounted, so the first
        // injection lands on a not-yet-ready document and is lost. Re-inject a few
        // times as the page comes up so the CSS vars stick on the live document.
        final Handler h = new Handler(Looper.getMainLooper());
        for (int delay : new int[]{300, 800, 1500, 3000}) {
            h.postDelayed(() -> injectInsets(web), delay);
        }
    }

    private void injectInsets(WebView web) {
        if (web == null) return;
        final String js = "(function(){var s=document.documentElement.style;"
            + "s.setProperty('--sat','" + satTop + "px');"
            + "s.setProperty('--sab','" + satBottom + "px');"
            + "s.setProperty('--sal','" + satLeft + "px');"
            + "s.setProperty('--sar','" + satRight + "px');})();";
        web.post(() -> web.evaluateJavascript(js, null));
    }
}
