package com.rdenno.dispatcharr.ui.common

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** A file picked from device storage. */
class PickedFile(val name: String, val bytes: ByteArray, val mime: String)

fun readPickedFile(context: Context, uri: Uri): PickedFile {
    val cr = context.contentResolver
    var name = "upload"
    cr.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) name = c.getString(0) ?: name
    }
    val mime = cr.getType(uri) ?: "application/octet-stream"
    val bytes = cr.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0)
    return PickedFile(name, bytes, mime)
}

/**
 * Returns a launcher to pick a file.
 */
@Composable
fun rememberFilePicker(onPicked: (PickedFile) -> Unit): androidx.activity.result.ActivityResultLauncher<String> {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val messenger = LocalMessenger.current
    return rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            try {
                val f = withContext(Dispatchers.IO) { readPickedFile(context, uri) }
                onPicked(f)
            } catch (t: Throwable) { messenger.error(t, "Could not read file") }
        }
    }
}

/**
 * Save-file launcher. Call `launch(suggestedName)`; [produce] is invoked to get bytes.
 */
@Composable
fun rememberFileSaver(mime: String = "application/octet-stream", produce: suspend () -> ByteArray): androidx.activity.result.ActivityResultLauncher<String> {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val messenger = LocalMessenger.current
    return rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument(mime)) { uri ->
        if (uri != null) scope.launch {
            try {
                val bytes = produce()
                withContext(Dispatchers.IO) { context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } }
                messenger.show("Saved")
            } catch (t: Throwable) { messenger.error(t, "Download failed") }
        }
    }
}

/** Copies text to the clipboard and shows a snackbar. */
fun copyToClipboard(context: Context, text: String, messenger: Messenger? = null) {
    val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
    cm.setPrimaryClip(android.content.ClipData.newPlainText("text", text))
    messenger?.show("Copied to clipboard")
}

/** Opens a URL in the browser / external app. */
fun openExternal(context: Context, url: String) {
    runCatching {
        context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(url)).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
