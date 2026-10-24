package com.rdenno.dispatcharr.ui.common

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay

sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Success<T>(val data: T) : LoadState<T>
    data class Error(val error: Throwable) : LoadState<Nothing>
}

/**
 * Holds the result of an async load with `reload()` support. Previous data is kept
 * in [data] while reloading so lists don't flash.
 */
@Stable
class Loadable<T> internal constructor() {
    var state by mutableStateOf<LoadState<T>>(LoadState.Loading)
        internal set
    var data by mutableStateOf<T?>(null)
        internal set
    var refreshing by mutableStateOf(false)
        internal set
    internal var trigger by mutableIntStateOf(0)

    fun reload() { trigger++ }

    /** Locally replace data (e.g. optimistic update). */
    fun set(value: T) { data = value; state = LoadState.Success(value) }
}

/**
 * ```
 * val channels = rememberLoadable(search) { api.get("/api/channels/channels/").resultsList() }
 * LoadableContent(channels) { list -> ... }
 * ```
 * @param pollMs if > 0 the loader is re-run every pollMs while composed (silent refresh).
 */
@Composable
fun <T> rememberLoadable(vararg keys: Any?, pollMs: Long = 0, loader: suspend () -> T): Loadable<T> {
    val l = remember { Loadable<T>() }
    LaunchedEffect(*keys, l.trigger) {
        l.refreshing = true
        if (l.data == null) l.state = LoadState.Loading
        try {
            val d = loader()
            l.data = d
            l.state = LoadState.Success(d)
        } catch (c: CancellationException) {
            throw c
        } catch (t: Throwable) {
            l.state = LoadState.Error(t)
        } finally {
            l.refreshing = false
        }
        if (pollMs > 0) {
            while (true) {
                delay(pollMs)
                try {
                    val d = loader(); l.data = d; l.state = LoadState.Success(d)
                } catch (c: CancellationException) {
                    throw c
                } catch (_: Throwable) { /* keep last data on silent poll failures */ }
            }
        }
    }
    return l
}

/** Renders loading spinner / error with retry / content. Keeps showing stale data while reloading. */
@Composable
fun <T> LoadableContent(
    loadable: Loadable<T>,
    content: @Composable (T) -> Unit,
) {
    val data = loadable.data
    when (val s = loadable.state) {
        is LoadState.Loading -> if (data != null) content(data) else LoadingBox()
        is LoadState.Error -> if (data != null) content(data) else ErrorBox(errorText(s.error), onRetry = loadable::reload)
        is LoadState.Success -> content(s.data)
    }
}
