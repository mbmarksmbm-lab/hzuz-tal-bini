package mt.hzuztalbini.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** Opens shared/tapped .hzuz project files in the app. */
public class MainActivity extends BridgeActivity {
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = null;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) {
            uri = intent.getData();
        } else if (Intent.ACTION_SEND.equals(action)) {
            Object extra = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (extra instanceof Uri) uri = (Uri) extra;
        }
        if (uri == null) return;
        final String text = readText(uri);
        if (text == null || !text.contains("hzuz-tal-bini")) return;
        intent.setAction(Intent.ACTION_MAIN);
        deliver(JSONObject.quote(text), 0);
    }

    private String readText(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n, total = 0;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > 1_000_000) return null;
                out.write(buf, 0, n);
            }
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        }
    }

    /** Hands the file to the page; retries until the page is ready (up to ~15 s). */
    private void deliver(final String quoted, final int attempt) {
        if (attempt > 30) return;
        WebView wv = (getBridge() != null) ? getBridge().getWebView() : null;
        if (wv == null) {
            handler.postDelayed(() -> deliver(quoted, attempt + 1), 500);
            return;
        }
        wv.evaluateJavascript(
            "(function(){try{return window.HZ_OPEN_PROJECT?(window.HZ_OPEN_PROJECT(" + quoted + "),'ok'):'wait'}catch(e){return 'err'}})()",
            result -> {
                if (result == null || result.contains("wait")) {
                    handler.postDelayed(() -> deliver(quoted, attempt + 1), 500);
                }
            });
    }
}
