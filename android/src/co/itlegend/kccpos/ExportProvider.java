package co.itlegend.kccpos;
import android.content.*;
import android.database.*;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.*;
/** Read-only, explicitly granted access to individual generated PDF files. */
public final class ExportProvider extends ContentProvider {
 public boolean onCreate(){return true;}
 private File file(Uri uri)throws FileNotFoundException{
  try{File dir=new File(getContext().getCacheDir(),"exports").getCanonicalFile();File f=new File(dir,uri.getLastPathSegment()).getCanonicalFile();if(!dir.equals(f.getParentFile())||!f.isFile())throw new FileNotFoundException();return f;}catch(IOException e){throw new FileNotFoundException();}
 }
 public String getType(Uri uri){return "application/pdf";}
 public ParcelFileDescriptor openFile(Uri uri,String mode)throws FileNotFoundException{if(!"r".equals(mode))throw new FileNotFoundException();return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.MODE_READ_ONLY);}
 public Cursor query(Uri uri,String[] projection,String selection,String[] args,String sort){
  try{File f=file(uri);String[] columns=projection==null?new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE}:projection;MatrixCursor c=new MatrixCursor(columns);Object[] row=new Object[columns.length];for(int i=0;i<columns.length;i++){if(OpenableColumns.DISPLAY_NAME.equals(columns[i]))row[i]=f.getName().substring(37);else if(OpenableColumns.SIZE.equals(columns[i]))row[i]=f.length();}c.addRow(row);return c;}catch(FileNotFoundException e){return null;}
 }
 public Uri insert(Uri uri,ContentValues v){throw new UnsupportedOperationException();}
 public int update(Uri uri,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
 public int delete(Uri uri,String s,String[] a){throw new UnsupportedOperationException();}
}
