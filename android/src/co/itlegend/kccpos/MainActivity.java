package co.itlegend.kccpos;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.graphics.Color;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Opens the live site using browser-managed authentication, downloads and sharing. */
public final class MainActivity extends Activity {
    private static final String URL = "https://itlegend-co.github.io/KCC-Pos/";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        int padding = (int)(24 * getResources().getDisplayMetrics().density);
        layout.setPadding(padding, padding, padding, padding);
        TextView title = new TextView(this);
        title.setText("KCC POS");
        title.setTextSize(28);
        layout.addView(title);
        TextView message = new TextView(this);
        message.setText("Connect to the internet to open the club desk.");
        layout.addView(message);
        Button open = new Button(this);
        open.setText("Open KCC POS");
        open.setOnClickListener(view -> openSite(message));
        layout.addView(open);
        setContentView(layout);
        if (state == null) openSite(message);
    }

    private void openSite(TextView message) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(URL));
        // A null session requests a Custom Tab without binding a browser service.
        Bundle extras = new Bundle();
        extras.putBinder("android.support.customtabs.extra.SESSION", null);
        intent.putExtras(extras);
        intent.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", Color.rgb(22,60,53));
        intent.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING", true);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            message.setText("Install or enable a web browser, then tap Open KCC POS.");
        }
    }
}
