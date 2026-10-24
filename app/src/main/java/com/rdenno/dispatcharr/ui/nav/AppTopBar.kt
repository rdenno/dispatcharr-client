package com.rdenno.dispatcharr.ui.nav

import androidx.compose.foundation.layout.RowScope
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.style.TextOverflow
import com.rdenno.dispatcharr.ui.notifications.NotificationBell
import com.rdenno.dispatcharr.ui.theme.DColors

/**
 * Standard top bar for top-level screens: hamburger (opens drawer), title, screen actions,
 * then the global notification bell. Pass [onBack] for pushed sub-screens to show a back arrow.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppTopBar(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    showBell: Boolean = true,
    actions: @Composable RowScope.() -> Unit = {},
) {
    val openDrawer = LocalDrawerOpener.current
    TopAppBar(
        title = {
            if (subtitle == null) Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis)
            else androidx.compose.foundation.layout.Column {
                Text(title, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(subtitle, style = androidx.compose.material3.MaterialTheme.typography.labelSmall, color = DColors.TextMuted, maxLines = 1)
            }
        },
        navigationIcon = {
            if (onBack != null) IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
            else IconButton(onClick = openDrawer) { Icon(Icons.Default.Menu, "Menu") }
        },
        actions = {
            actions()
            if (showBell) NotificationBell()
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = DColors.Surface),
    )
}
