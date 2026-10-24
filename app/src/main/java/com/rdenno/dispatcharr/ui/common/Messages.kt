package com.rdenno.dispatcharr.ui.common

import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.rdenno.dispatcharr.data.ApiException
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** Global snackbar messenger (equivalent of Mantine `notifications.show`). */
class Messenger(val host: SnackbarHostState, private val scope: CoroutineScope) {
    fun show(message: String, long: Boolean = false) {
        scope.launch {
            host.currentSnackbarData?.dismiss()
            host.showSnackbar(message, withDismissAction = true, duration = if (long) SnackbarDuration.Long else SnackbarDuration.Short)
        }
    }

    fun error(t: Throwable, prefix: String? = null) {
        if (t is CancellationException) return
        val msg = errorText(t)
        show(if (prefix != null) "$prefix: $msg" else msg, long = true)
    }
}

fun errorText(t: Throwable): String = when (t) {
    is ApiException -> t.friendly
    is java.net.UnknownHostException -> "Cannot resolve server host"
    is java.net.ConnectException -> "Cannot connect to server"
    is java.net.SocketTimeoutException -> "Request timed out"
    else -> t.message ?: t.javaClass.simpleName
}

val LocalMessenger = compositionLocalOf<Messenger> { error("Messenger not provided") }

/**
 * Runs suspend actions with busy state + error snackbar. Usage:
 * ```
 * val action = rememberAction()
 * Button(enabled = !action.busy, onClick = { action.run("Saved") { api.post(...) } })
 * ```
 */
class ActionRunner(private val scope: CoroutineScope, private val messenger: Messenger) {
    var busy by mutableStateOf(false)
        private set

    fun run(
        successMessage: String? = null,
        errorPrefix: String? = null,
        onSuccess: () -> Unit = {},
        block: suspend () -> Unit,
    ) {
        scope.launch {
            busy = true
            try {
                block()
                successMessage?.let { messenger.show(it) }
                onSuccess()
            } catch (t: Throwable) {
                messenger.error(t, errorPrefix)
            } finally {
                busy = false
            }
        }
    }
}

@Composable
fun rememberAction(): ActionRunner {
    val scope = rememberCoroutineScope()
    val messenger = LocalMessenger.current
    return remember(scope, messenger) { ActionRunner(scope, messenger) }
}
