package com.rdenno.dispatcharr.ui.notifications

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@Composable
fun NotificationBell() {
    var open by remember { mutableStateOf(false) }
    // Periodically poll count
    val countState = rememberLoadable(pollMs = 15000) {
        val res = App.api.get("/api/core/notifications/count/").asObj()
        res.int("unread") ?: res.int("count") ?: 0
    }
    val count = countState.data ?: 0

    IconButton(onClick = { open = true }) {
        BadgedBox(badge = {
            if (count > 0) {
                Badge(containerColor = DColors.Red) {
                    Text("$count")
                }
            }
        }) {
            Icon(
                if (count > 0) Icons.Default.Notifications else Icons.Default.NotificationsNone,
                contentDescription = "Notifications"
            )
        }
    }

    if (open) {
        NotificationCenterDialog(onDismiss = {
            open = false
            countState.reload()
        })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationCenterDialog(onDismiss: () -> Unit) {
    val action = rememberAction()
    val notifs = rememberLoadable {
        App.api.get("/api/core/notifications/", mapOf("include_dismissed" to false)).resultsList()
    }

    FullScreenDialog(
        title = "Notifications",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("All dismissed") {
                        App.api.post("/api/core/notifications/dismiss-all/")
                        notifs.reload()
                    }
                },
                enabled = !notifs.data.isNullOrEmpty()
            ) {
                Text("Dismiss All", color = DColors.Teal)
            }
        },
        scrollable = false,
        contentPadding = 0.dp
    ) {
        LoadableContent(notifs) { items ->
            if (items.isEmpty()) {
                EmptyBox(message = "No unread notifications", icon = Icons.Default.NotificationsNone)
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(items, key = { it.str("id") ?: it.toString() }) { n ->
                        NotificationItemCard(n) {
                            action.run {
                                val id = n.str("id") ?: n.int("id")?.toString()
                                if (id != null) {
                                    App.api.post("/api/core/notifications/$id/dismiss/")
                                    notifs.reload()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationItemCard(notification: JsonObject, onDismiss: () -> Unit) {
    val title = notification.str("title") ?: "Notification"
    val message = notification.str("message") ?: ""
    val createdAt = notification.str("created_at") ?: notification.str("timestamp")
    val level = notification.str("level") ?: "info"

    val badgeColor = when (level.lowercase()) {
        "error", "critical" -> DColors.Red
        "warning" -> DColors.Orange
        "success" -> DColors.Green
        else -> DColors.Blue
    }

    ItemCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    com.rdenno.dispatcharr.ui.common.Badge(text = level.uppercase(), color = badgeColor)
                    Text(title, style = MaterialTheme.typography.titleMedium)
                }
                if (message.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(message, style = MaterialTheme.typography.bodyMedium, color = DColors.TextSecondary)
                }
                if (!createdAt.isNullOrBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Text(Fmt.relative(createdAt), style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                }
            }
            IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = DColors.TextMuted)
            }
        }
    }
}
