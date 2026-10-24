package com.rdenno.dispatcharr.ui.dvr

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.nav.LocalNavigator
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DvrScreen() {
    val nav = LocalNavigator.current
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Recordings", "Rules")

    var searchQuery by remember { mutableStateOf("") }
    var createRecordDialogOpen by remember { mutableStateOf(false) }

    val recordingsLoadable = rememberLoadable(searchQuery) {
        val q = if (searchQuery.isNotBlank()) mapOf("search" to searchQuery) else emptyMap()
        App.api.get("/api/channels/recordings/", q).resultsList()
    }

    val recurringRulesLoadable = rememberLoadable {
        App.api.get("/api/channels/recurring-rules/").resultsList()
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "DVR Manager",
                subtitle = if (selectedTab == 0) "Recorded & Upcoming Broadcasts" else "Series & Recurring Recording Rules"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = DColors.Surface,
                contentColor = Color.White
            ) {
                tabs.forEachIndexed { idx, title ->
                    Tab(
                        selected = selectedTab == idx,
                        onClick = { selectedTab = idx },
                        text = { Text(title) }
                    )
                }
            }

            if (selectedTab == 0) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    SearchField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.weight(1f),
                        placeholder = "Search recordings..."
                    )
                    Button(onClick = { createRecordDialogOpen = true }) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("Record")
                    }
                }

                RefreshableBox(
                    refreshing = recordingsLoadable.refreshing,
                    onRefresh = { recordingsLoadable.reload() }
                ) {
                    LoadableContent(recordingsLoadable) { list ->
                        if (list.isEmpty()) {
                            EmptyBox("No recordings found")
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = ListPadding,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(list, key = { it.int("id") ?: it.toString() }) { rec ->
                                    val status = rec.str("status") ?: "completed"
                                    val title = rec.str("title") ?: "Recording"
                                    val channelName = rec.path("channel.name").asStr() ?: rec.str("channel_name") ?: "Channel"
                                    val startTime = rec.str("start_time")
                                    val fileUrl = rec.str("file_url")

                                    val statusColor = when (status.lowercase()) {
                                        "recording" -> DColors.Red
                                        "scheduled", "upcoming" -> DColors.Orange
                                        "completed" -> DColors.Green
                                        else -> DColors.Blue
                                    }

                                    ItemCard(
                                        onClick = {
                                            if (!fileUrl.isNullOrBlank()) {
                                                nav.play(fileUrl, title, live = false)
                                            }
                                        }
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                    Badge(status.uppercase(), color = statusColor)
                                                }
                                                Spacer(Modifier.height(4.dp))
                                                Text(channelName, style = MaterialTheme.typography.bodySmall, color = DColors.Teal)
                                                if (startTime != null) {
                                                    Text(Fmt.dateTime(startTime), style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                                                }
                                            }

                                            if (!fileUrl.isNullOrBlank()) {
                                                IconButton(
                                                    onClick = { nav.play(fileUrl, title, live = false) }
                                                ) {
                                                    Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = DColors.Teal)
                                                }
                                            }

                                            OverflowMenu(
                                                actions = listOf(
                                                    MenuAction(
                                                        label = "Extend +15m",
                                                        icon = Icons.Default.MoreTime,
                                                        onClick = {
                                                            action.run("Recording extended") {
                                                                App.api.post("/api/channels/recordings/${rec.int("id")}/extend/", mapOf("extra_minutes" to 15))
                                                                recordingsLoadable.reload()
                                                            }
                                                        }
                                                    ),
                                                    MenuAction(
                                                        label = "Run Comskip",
                                                        icon = Icons.Default.FastForward,
                                                        onClick = {
                                                            action.run("Comskip launched") {
                                                                App.api.post("/api/channels/recordings/${rec.int("id")}/comskip/")
                                                            }
                                                        }
                                                    ),
                                                    MenuAction(
                                                        label = "Stop Recording",
                                                        icon = Icons.Default.Stop,
                                                        onClick = {
                                                            action.run("Recording stopped") {
                                                                App.api.post("/api/channels/recordings/${rec.int("id")}/stop/")
                                                                recordingsLoadable.reload()
                                                            }
                                                        }
                                                    ),
                                                    MenuAction(
                                                        label = "Delete Recording",
                                                        icon = Icons.Default.Delete,
                                                        destructive = true,
                                                        onClick = {
                                                            confirm.ask("Delete Recording", "Delete recording '$title'?") {
                                                                action.run("Recording deleted") {
                                                                    App.api.delete("/api/channels/recordings/${rec.int("id")}/")
                                                                    recordingsLoadable.reload()
                                                                }
                                                            }
                                                        }
                                                    )
                                                )
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Rules tab
                RefreshableBox(
                    refreshing = recurringRulesLoadable.refreshing,
                    onRefresh = { recurringRulesLoadable.reload() }
                ) {
                    LoadableContent(recurringRulesLoadable) { rules ->
                        if (rules.isEmpty()) {
                            EmptyBox("No recurring DVR rules")
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = ListPadding,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(rules, key = { it.int("id") ?: it.toString() }) { rule ->
                                    val name = rule.str("name") ?: rule.str("title") ?: "Recurring Rule"
                                    val channelName = rule.path("channel.name").asStr() ?: "Any Channel"

                                    ItemCard {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Text(channelName, style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                            }

                                            IconButton(
                                                onClick = {
                                                    confirm.ask("Delete Rule", "Delete recurring rule '$name'?") {
                                                        action.run("Rule deleted") {
                                                            App.api.delete("/api/channels/recurring-rules/${rule.int("id")}/")
                                                            recurringRulesLoadable.reload()
                                                        }
                                                    }
                                                }
                                            ) {
                                                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DColors.Red)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (createRecordDialogOpen) {
        CreateManualRecordDialog(
            onDismiss = { createRecordDialogOpen = false },
            onCreated = {
                createRecordDialogOpen = false
                recordingsLoadable.reload()
            }
        )
    }
}

@Composable
fun CreateManualRecordDialog(
    onDismiss: () -> Unit,
    onCreated: () -> Unit
) {
    val action = rememberAction()
    var title by remember { mutableStateOf("") }
    var durationMinutes by remember { mutableStateOf("60") }
    var selectedChannelId by remember { mutableStateOf<Int?>(null) }

    val channelsLoadable = rememberLoadable {
        App.api.get("/api/channels/channels/", mapOf("enabled" to true)).resultsList()
    }

    FullScreenDialog(
        title = "Record Channel",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("Recording scheduled", onSuccess = onCreated) {
                        val duration = durationMinutes.toIntOrNull() ?: 60
                        App.api.post(
                            "/api/channels/recordings/",
                            mapOf(
                                "channel_id" to selectedChannelId,
                                "title" to title,
                                "duration_minutes" to duration
                            )
                        )
                    }
                },
                enabled = !action.busy && title.isNotBlank() && selectedChannelId != null
            ) {
                Text("Start Record", color = DColors.Teal)
            }
        }
    ) {
        TextInput("Recording Title", title, { title = it })
        IntInput("Duration (minutes)", durationMinutes.toIntOrNull(), { durationMinutes = it?.toString() ?: "" })

        SelectField(
            label = "Target Channel",
            options = channelsLoadable.data?.map {
                Option(it.int("id") ?: 0, "${it.double("channel_number") ?: ""} ${it.str("name") ?: ""}".trim())
            } ?: emptyList(),
            selected = selectedChannelId,
            onSelect = { selectedChannelId = it },
            noneLabel = "Select Channel"
        )
    }
}
