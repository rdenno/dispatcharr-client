package com.rdenno.dispatcharr.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.ui.theme.DColors

@Composable
fun LoadingBox(modifier: Modifier = Modifier.fillMaxSize()) {
    Box(modifier, contentAlignment = Alignment.Center) { CircularProgressIndicator() }
}

@Composable
fun ErrorBox(message: String, modifier: Modifier = Modifier.fillMaxSize(), onRetry: (() -> Unit)? = null) {
    Column(
        modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Default.ErrorOutline, null, tint = DColors.Red, modifier = Modifier.size(48.dp))
        Spacer(Modifier.height(8.dp))
        Text(message, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (onRetry != null) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = onRetry) { Text("Retry") }
        }
    }
}

@Composable
fun EmptyBox(message: String, modifier: Modifier = Modifier.fillMaxSize(), icon: ImageVector = Icons.Default.Inbox) {
    Column(
        modifier.padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(icon, null, tint = DColors.TextMuted, modifier = Modifier.size(48.dp))
        Spacer(Modifier.height(8.dp))
        Text(message, textAlign = TextAlign.Center, color = DColors.TextMuted)
    }
}

/** Simple yes/no confirmation (web: ConfirmationDialog). */
@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String = "Confirm",
    destructive: Boolean = false,
    onDismiss: () -> Unit,
    extraContent: (@Composable ColumnScope.() -> Unit)? = null,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(message)
                extraContent?.invoke(this)
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(); onDismiss() }) {
                Text(confirmText, color = if (destructive) DColors.Red else MaterialTheme.colorScheme.primary)
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

/** Helper state for "confirm before doing X" flows. */
class ConfirmState {
    var pending by mutableStateOf<ConfirmRequest?>(null)
    fun ask(title: String, message: String, confirmText: String = "Confirm", destructive: Boolean = true, onConfirm: () -> Unit) {
        pending = ConfirmRequest(title, message, confirmText, destructive, onConfirm)
    }
}

data class ConfirmRequest(val title: String, val message: String, val confirmText: String, val destructive: Boolean, val onConfirm: () -> Unit)

@Composable
fun rememberConfirm(): ConfirmState = remember { ConfirmState() }

/** Place once in a screen to render dialogs requested via [ConfirmState.ask]. */
@Composable
fun ConfirmHost(state: ConfirmState) {
    val p = state.pending ?: return
    ConfirmDialog(p.title, p.message, p.confirmText, p.destructive, onDismiss = { state.pending = null }, onConfirm = p.onConfirm)
}

@Composable
fun SectionHeader(text: String, modifier: Modifier = Modifier, trailing: (@Composable RowScope.() -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
        trailing?.invoke(this)
    }
}

@Composable
fun InfoRow(label: String, value: String?, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(label, color = DColors.TextMuted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(130.dp))
        Text(value ?: "—", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
    }
}

/** Small coloured pill (web: Mantine Badge). */
@Composable
fun Badge(text: String, color: Color = DColors.Teal, modifier: Modifier = Modifier) {
    Box(
        modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.22f))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text, color = color, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

/** Card container used for list rows. */
@Composable
fun ItemCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    selected: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    val colors = CardDefaults.cardColors(
        containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer else DColors.Surface
    )
    if (onClick != null) {
        Card(onClick = onClick, modifier = modifier.fillMaxWidth(), colors = colors, shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(12.dp), content = content)
        }
    } else {
        Card(modifier = modifier.fillMaxWidth(), colors = colors, shape = RoundedCornerShape(10.dp)) {
            Column(Modifier.padding(12.dp), content = content)
        }
    }
}

/** Logo/thumbnail from a server-relative or absolute URL, with placeholder icon. */
@Composable
fun RemoteImage(
    url: String?,
    modifier: Modifier = Modifier.size(40.dp),
    contentScale: ContentScale = ContentScale.Fit,
    placeholder: ImageVector = Icons.Default.Tv,
) {
    val abs = remember(url) { App.api.absoluteUrl(url) }
    if (abs == null) {
        Box(modifier, contentAlignment = Alignment.Center) { Icon(placeholder, null, tint = DColors.TextMuted) }
        return
    }
    SubcomposeAsyncImage(
        model = abs,
        contentDescription = null,
        modifier = modifier,
        contentScale = contentScale,
        error = { Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Icon(placeholder, null, tint = DColors.TextMuted) } },
        loading = { Box(Modifier.fillMaxSize()) },
    )
}

@Composable
fun SearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search",
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        placeholder = { Text(placeholder) },
        leadingIcon = { Icon(Icons.Default.Search, null) },
        trailingIcon = if (value.isNotEmpty()) {
            { IconButton(onClick = { onValueChange("") }) { Icon(Icons.Default.Close, "Clear") } }
        } else null,
        shape = RoundedCornerShape(10.dp),
    )
}

data class MenuAction(
    val label: String,
    val icon: ImageVector? = null,
    val destructive: Boolean = false,
    val enabled: Boolean = true,
    val onClick: () -> Unit,
)

/** Three-dot overflow menu. */
@Composable
fun OverflowMenu(actions: List<MenuAction>, icon: ImageVector = Icons.Default.MoreVert) {
    var open by remember { mutableStateOf(false) }
    Box {
        IconButton(onClick = { open = true }) { Icon(icon, "More") }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            actions.forEach { a ->
                DropdownMenuItem(
                    text = { Text(a.label, color = if (a.destructive) DColors.Red else Color.Unspecified) },
                    leadingIcon = a.icon?.let { { Icon(it, null, tint = if (a.destructive) DColors.Red else MaterialTheme.colorScheme.onSurface) } },
                    enabled = a.enabled,
                    onClick = { open = false; a.onClick() },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RefreshableBox(refreshing: Boolean, onRefresh: () -> Unit, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    PullToRefreshBox(isRefreshing = refreshing, onRefresh = onRefresh, modifier = modifier.fillMaxSize()) { content() }
}

/**
 * Full-screen dialog with its own top bar; the standard container for forms / detail views
 * (replaces Mantine modals on mobile).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FullScreenDialog(
    title: String,
    onDismiss: () -> Unit,
    actions: @Composable RowScope.() -> Unit = {},
    scrollable: Boolean = true,
    contentPadding: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        navigationIcon = { IconButton(onClick = onDismiss) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Close") } },
                        actions = actions,
                        colors = TopAppBarDefaults.topAppBarColors(containerColor = DColors.Surface),
                    )
                },
            ) { pad ->
                val m = Modifier.padding(pad).fillMaxSize().imePadding()
                Column(
                    if (scrollable) m.verticalScroll(rememberScrollState()).padding(contentPadding) else m.padding(contentPadding),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    content = content,
                )
            }
        }
    }
}

@Composable
fun Divider() = HorizontalDivider(color = DColors.Border)

/** Standard list padding for LazyColumn screens. */
val ListPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 8.dp, bottom = 88.dp)

@Composable
fun ClickableRow(onClick: () -> Unit, modifier: Modifier = Modifier, content: @Composable RowScope.() -> Unit) {
    Row(
        modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}
