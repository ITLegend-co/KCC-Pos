package co.itlegend.kccpos;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.graphics.*;
import android.graphics.pdf.PdfRenderer;
import android.print.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.util.UUID;

/** Standalone online client. No JavaScript interface is exposed to subframes. */
public final class MainActivity extends Activity {
    private static final String URL="https://itlegend-co.github.io/KCC-Pos/";
    private static final int PICK=10, SAVE=11;
    private WebView web, printWeb;
    private WebMessagePort port;
    private ValueCallback<Uri[]> chooser;
    private byte[] pending;
    private LinearLayout root;
    private ProgressBar progress;
    private boolean failed;

    private boolean trusted(String url) {
        if(url==null)return false;
        Uri u=Uri.parse(url);
        return "https".equals(u.getScheme()) && "itlegend-co.github.io".equals(u.getHost())
            && u.getPort()==-1 && u.getUserInfo()==null && u.getPath()!=null && u.getPath().startsWith("/KCC-Pos/");
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(22,60,53));
        getWindow().setNavigationBarColor(Color.rgb(22,60,53));
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(22,60,53));
        // Keep the app clear of system bars, display cutouts and the keyboard on Android 15.
        root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets.consumeSystemWindowInsets();});
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        root.addView(progress,new LinearLayout.LayoutParams(-1,6));
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()+" KCCPOS/2");
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){
                String url=req.getUrl().toString();
                if(trusted(url))return false;
                if(req.isForMainFrame() && req.hasGesture() && "https".equals(req.getUrl().getScheme())){
                    try{startActivity(new Intent(Intent.ACTION_VIEW,req.getUrl()));}catch(ActivityNotFoundException e){notice("No app can open this link.");}
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,String url){return !trusted(url);}
            @Override public void onPageStarted(WebView v,String url,Bitmap icon){failed=false;progress.setVisibility(View.VISIBLE);if(port!=null){port.close();port=null;}}
            @Override public void onPageFinished(WebView v,String url){
                progress.setVisibility(View.GONE);
                if(!failed && trusted(url)){
                    WebMessagePort[] channel=v.createWebMessageChannel();port=channel[0];
                    port.setWebMessageCallback(new WebMessagePort.WebMessageCallback(){
                        @Override public void onMessage(WebMessagePort p,WebMessage msg){
                            if(!trusted(web.getUrl()))return;
                            try{handle(msg.getData());}catch(Exception e){notice("Unable to open or export the document. Please try again.");}
                        }
                    });
                    v.postWebMessage(new WebMessage("kcc-native-ready",new WebMessagePort[]{channel[1]}),Uri.parse("https://itlegend-co.github.io"));
                }
            }
            @Override public void onReceivedError(WebView v,WebResourceRequest req,WebResourceError error){if(req.isForMainFrame())offline();}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest req,WebResourceResponse response){if(req.isForMainFrame())offline();}
            private void offline(){if(failed)return;failed=true;progress.setVisibility(View.GONE);new AlertDialog.Builder(MainActivity.this).setTitle("Cannot connect to KCC POS").setMessage("Check your internet connection, then try again.").setPositiveButton("Retry",(d,w)->web.loadUrl(URL)).setNegativeButton("Close",(d,w)->finish()).setCancelable(false).show();}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int n){progress.setProgress(n);}
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(!trusted(v.getUrl()))return false;
                if(chooser!=null)chooser.onReceiveValue(null);chooser=callback;
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/octet-stream"});
                try{startActivityForResult(i,PICK);}catch(ActivityNotFoundException e){chooser.onReceiveValue(null);chooser=null;notice("No file picker is available.");}return true;
            }
            @Override public boolean onJsAlert(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
            @Override public boolean onJsPrompt(WebView v,String url,String message,String initial,JsPromptResult result){
                EditText input=new EditText(MainActivity.this);input.setText(initial);input.setSingleLine(false);
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setView(input).setPositiveButton("Confirm",(d,w)->result.confirm(input.getText().toString())).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
            }
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Confirm",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}
        });
        // Remove expired exports without touching authentication or financial records.
        File dir=new File(getCacheDir(),"exports");File[] old=dir.listFiles();if(old!=null)for(File f:old)if(System.currentTimeMillis()-f.lastModified()>86400000L)f.delete();
        web.loadUrl(URL);
    }
    private void handle(String raw)throws Exception{
        if(raw==null || raw.length()>22*1024*1024)throw new IOException("Oversized message");
        JSONObject m=new JSONObject(raw);String action=m.getString("action");
        String name=m.optString("name","KCC-document").replaceAll("[^A-Za-z0-9._ -]","_");if(name.length()>150)name=name.substring(0,150);
        if("html".equals(action)){printHtml(m.getString("data"),name);return;}
        String type=m.optString("type");
        if(!type.equals("application/pdf")&&!type.equals("text/csv")&&!type.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")&&!type.equals("application/octet-stream"))throw new IOException("Unsupported type");
        byte[] bytes=android.util.Base64.decode(m.getString("data"),android.util.Base64.DEFAULT);
        if(bytes.length>15*1024*1024)throw new IOException("Oversized file");
        if("save".equals(action)){save(bytes,name,type);return;}
        if(!type.equals("application/pdf"))throw new IOException("Expected PDF");
        if("preview".equals(action))preview(bytes,name);
        else if("share".equals(action))share(bytes,name);
        else if("print".equals(action))printPdf(bytes,name);
    }
    private void save(byte[] bytes,String name,String type){
        if(pending!=null){notice("Finish the current save first.");return;}pending=bytes;
        Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(type).putExtra(Intent.EXTRA_TITLE,name);
        try{startActivityForResult(i,SAVE);}catch(ActivityNotFoundException e){pending=null;notice("No file picker is available.");}
    }
    private File export(byte[] bytes,String name)throws IOException{
        File dir=new File(getCacheDir(),"exports");dir.mkdirs();File f=new File(dir,UUID.randomUUID()+"_"+name);
        try(FileOutputStream out=new FileOutputStream(f)){out.write(bytes);}return f;
    }
    private void share(byte[] bytes,String name){try{
        File f=export(bytes,name);Uri u=Uri.parse("content://co.itlegend.kccpos.exports/"+Uri.encode(f.getName()));
        Intent i=new Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM,u).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        i.setClipData(ClipData.newRawUri(name,u));startActivity(Intent.createChooser(i,"Share receipt"));
    }catch(Exception e){notice("Unable to share this PDF.");}}
    private void preview(byte[] bytes,String name)throws IOException{
        File f=export(bytes,name);
        java.util.ArrayList<Bitmap> images=new java.util.ArrayList<>();
        ScrollView scroll=new ScrollView(this);LinearLayout pages=new LinearLayout(this);pages.setOrientation(LinearLayout.VERTICAL);scroll.addView(pages);
        try(ParcelFileDescriptor fd=ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer=new PdfRenderer(fd)){
            if(renderer.getPageCount()>20){save(bytes,name,"application/pdf");return;}
            int width=Math.min(getResources().getDisplayMetrics().widthPixels,1000);
            for(int n=0;n<renderer.getPageCount();n++)try(PdfRenderer.Page page=renderer.openPage(n)){
                Bitmap bitmap=Bitmap.createBitmap(width,(int)(width*(double)page.getHeight()/page.getWidth()),Bitmap.Config.ARGB_8888);bitmap.eraseColor(Color.WHITE);
                page.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);images.add(bitmap);
                ImageView image=new ImageView(this);image.setAdjustViewBounds(true);image.setImageBitmap(bitmap);pages.addView(image);
            }
        }finally{f.delete();}
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(name).setView(scroll).setPositiveButton("Save",null).setNeutralButton("Share",null).setNegativeButton("Print",null).create();
        dialog.setOnShowListener(d->{dialog.getButton(-1).setOnClickListener(v->save(bytes,name,"application/pdf"));dialog.getButton(-3).setOnClickListener(v->share(bytes,name));dialog.getButton(-2).setOnClickListener(v->printPdf(bytes,name));});
        dialog.setOnDismissListener(d->{pages.removeAllViews();for(Bitmap bitmap:images)bitmap.recycle();});dialog.show();
    }
    private void printPdf(byte[] bytes,String name){
        ((PrintManager)getSystemService(PRINT_SERVICE)).print(name,new PrintDocumentAdapter(){
            @Override public void onLayout(PrintAttributes old,PrintAttributes next,CancellationSignal cancel,LayoutResultCallback callback,Bundle extras){if(cancel.isCanceled())callback.onLayoutCancelled();else callback.onLayoutFinished(new PrintDocumentInfo.Builder(name).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).setPageCount(PrintDocumentInfo.PAGE_COUNT_UNKNOWN).build(),true);}
            @Override public void onWrite(PageRange[] pages,ParcelFileDescriptor dest,CancellationSignal cancel,WriteResultCallback callback){
                if(cancel.isCanceled()){callback.onWriteCancelled();return;}
                try(FileOutputStream out=new FileOutputStream(dest.getFileDescriptor())){out.write(bytes);callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});}catch(IOException e){callback.onWriteFailed("Unable to print PDF");}
            }
        },null);
    }
    private void printHtml(String html,String name){
        if(printWeb!=null){notice("Finish or close the current print job first.");return;}
        printWeb=new WebView(this);printWeb.getSettings().setJavaScriptEnabled(false);printWeb.getSettings().setAllowFileAccess(false);printWeb.getSettings().setAllowContentAccess(false);
        printWeb.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
            @Override public void onPageFinished(WebView v,String url){
                PrintDocumentAdapter delegate=v.createPrintDocumentAdapter(name);
                ((PrintManager)getSystemService(PRINT_SERVICE)).print(name,new PrintDocumentAdapter(){
                    @Override public void onStart(){delegate.onStart();}
                    @Override public void onLayout(PrintAttributes a,PrintAttributes b,CancellationSignal c,LayoutResultCallback d,Bundle e){delegate.onLayout(a,b,c,d,e);}
                    @Override public void onWrite(PageRange[] a,ParcelFileDescriptor b,CancellationSignal c,WriteResultCallback d){delegate.onWrite(a,b,c,d);}
                    @Override public void onFinish(){delegate.onFinish();v.destroy();printWeb=null;}
                },null);
            }
        });printWeb.loadDataWithBaseURL(null,html,"text/html","UTF-8",null);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(request==PICK && chooser!=null){Uri uri=data==null?null:data.getData();chooser.onReceiveValue(result==RESULT_OK&&uri!=null&&"content".equals(uri.getScheme())&&!getPackageName().concat(".exports").equals(uri.getAuthority())?new Uri[]{uri}:null);chooser=null;}
        if(request==SAVE){byte[] bytes=pending;pending=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&bytes!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException();out.write(bytes);notice("File saved.");}catch(IOException e){notice("Unable to save the file. Please try again.");}}}
    }
    private void notice(String message){Toast.makeText(this,message,Toast.LENGTH_LONG).show();}
    @Override public void onBackPressed(){web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}const b=document.querySelector('nav button.active');if(b&&b.dataset.page!=='overview'){document.querySelector('[data-page=overview]').click();return true;}return false;})()",value->{if(!"true".equals(value))new AlertDialog.Builder(this).setMessage("Close KCC POS?").setPositiveButton("Close",(d,w)->finish()).setNegativeButton("Cancel",null).show();});}
    @Override protected void onPause(){super.onPause();CookieManager.getInstance().flush();web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(port!=null)port.close();if(web!=null)web.destroy();if(printWeb!=null)printWeb.destroy();super.onDestroy();}
}
