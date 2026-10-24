package com.rdenno.dispatcharr.ui.guide

import androidx.compose.foundation.background
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
fun GuideScreen() {
    val nav = LocalNavigator.current
    val action = rememberAction()

    var searchQuery by remember { mutableStateOf("") }
    var selectedChannelGroup by remember { mutableStateOf<Int?>(null) }
    var selectedProgram by remember { mutableStateOf<Pair<JsonObject, JsonObject>?>(null) }

    val channelGroups by App.session.channelGroups.collectAsState()

    // Load channels and current on-air program
    val guideData = rememberLoadable(searchQuery, selectedChannelGroup) {
        val q = mutableMapOf<String, Any?>("enabled" to true)
        if (searchQuery.isNotBlank()) q["search"] = searchQuery
        if (selectedChannelGroup != null) q["channel_group"] = selectedChannelGroup

        val channels = App.api.get("/api/channels/channels/", q).resultsList()
        val uuids = channels.mapNotNull { it.str("uuid") }

        val currentPrograms = if (uuids.isNotEmpty()) {
            runCatching {
                App.api.post("/api/epg/current-programs/", mapOf("channel_uuids" to uuids)).asObj()
            }.getOrNull()
        } else null

        channels to currentPrograms
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "TV Guide",
                subtitle = "Now Playing & Electronic Program Guide"
            )
        }
    ) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .fillMaxSize()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SearchField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.weight(1f),
                    placeholder = "Search TV Guide..."
                )
                IconButton(onClick = { guideData.reload() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = DColors.Teal)
                }
            }

            if (channelGroups.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    FilterChip(
                        selected = selectedChannelGroup == null,
                        onClick = { selectedChannelGroup = null },
                        label = { Text("All Groups") }
                    )
                    channelGroups.take(5).forEach { g ->
                        val gid = g.int("id")
                        FilterChip(
                            selected = selectedChannelGroup == gid,
                            onClick = { selectedChannelGroup = if (selectedChannelGroup == gid) null else gid },
                            label = { Text(g.str("name") ?: "") }
                        )
                    }
                }
            }

            RefreshableBox(
                refreshing = guideData.refreshing,
                onRefresh = { guideData.reload() }
            ) {
                LoadableContent(guideData) { (channels, programsMap) ->
                    if (channels.isEmpty()) {
                        EmptyBox("No channels found in TV Guide")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(channels, key = { it.int("id") ?: it.str("uuid") ?: it.toString() }) { ch ->
                                val uuid = ch.str("uuid")
                                val curProg = uuid?.let { programsMap?.obj(it) }

                                GuideRowItem(
                                    channel = ch,
                                    currentProgram = curProg,
                                    onPlay = {
                                        val url = "/proxy/ts/stream/$uuid"
                                        nav.play(url, ch.str("name") ?: "Live TV", live = true)
                                    },
                                    onProgramClick = { prog ->
                                        selectedProgram = prog to ch
                                    }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    selectedProgram?.let { (prog, ch) ->
        ProgramDetailsDialog(
            program = prog,
            channel = ch,
            onDismiss = { selectedProgram = null },
            onPlay = {
                val uuid = ch.str("uuid")
                val url = "/proxy/ts/stream/$uuid"
                nav.play(url, ch.str("name") ?: "Live TV", live = true)
                selectedProgram = null
            }
        )
    }
}

@Composable
fun GuideRowItem(
    channel: JsonObject,
    currentProgram: JsonObject?,
    onPlay: () -> Unit,
    onProgramClick: (JsonObject) -> Unit
) {
    val chNum = channel.double("channel_number")?.let {
        if (it % 1.0 == 0.0) it.toInt().toString() else it.toString()
    } ?: "—"
    val chName = channel.str("name") ?: "Channel"
    val logoUrl = channel.str("logo_url") ?: channel.path("logo.url").asStr()

    val progTitle = currentProgram?.str("title") ?: "No program data available"
    val start = currentProgram?.str("start")
    val stop = currentProgram?.str("stop")
    val desc = currentProgram?.str("description")

    ItemCard(onClick = onPlay) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(44.dp)) {
                Text(chNum, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DColors.Teal)
                RemoteImage(url = logoUrl, modifier = Modifier.size(32.dp))
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { currentProgram?.let(onProgramClick) }
            ) {
                Text(chName, style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted, maxLines = 1)
                Text(progTitle, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)

                if (start != null && stop != null) {
                    Text(
                        "${Fmt.time(start)} – ${Fmt.time(stop)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = DColors.TealLight
                    )
                }

                if (!desc.isNullOrBlank()) {
                    Text(
                        desc,
                        style = MaterialTheme.typography.bodySmall,
                        color = DColors.TextSecondary,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            IconButton(onClick = onPlay) {
                Icon(Icons.Default.PlayCircle, contentDescription = "Watch", tint = DColors.Teal, modifier = Modifier.size(32.dp))
            }
        }
    }
}

@Composable
fun ProgramDetailsDialog(
    program: JsonObject,
    channel: JsonObject,
    onDismiss: () -> Unit,
    onPlay: () -> Unit
) {
    val action = rememberAction()
    val title = program.str("title") ?: "Program Details"
    val start = program.str("start")
    val stop = program.str("stop")
    val desc = program.str("description")
    val category = program.str("category")

    FullScreenDialog(
        title = title,
        onDismiss = onDismiss,
        actions = {
            IconButton(onClick = onPlay) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = DColors.Teal)
            }
        }
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            RemoteImage(url = channel.str("logo_url"), modifier = Modifier.size(40.dp))
            Column {
                Text(channel.str("name") ?: "Channel", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (start != null && stop != null) {
                    Text("${Fmt.time(start)} – ${Fmt.time(stop)}", style = MaterialTheme.typography.bodySmall, color = DColors.Teal)
                }
            }
        }

        Spacer(Modifier.height(8.dp))

        if (!category.isNullOrBlank()) {
            Badge(category, color = DColors.Blue)
        }

        if (!desc.isNullOrBlank()) {
            Text("Synopsis", style = MaterialTheme.typography.titleSmall, color = DColors.TextMuted)
            Text(desc, style = MaterialTheme.typography.bodyMedium)
        }

        Spacer(Modifier.height(16.dp))

        Button(
            onClick = {
                action.run("Scheduled recording created") {
                    App.api.post(
                        "/api/channels/recordings/",
                        mapOf(
                            "channel_id" to channel.int("id"),
                            "title" to title,
                            "start_time" to start,
                            "end_time" to stop
                        )
                    )
                    onDismiss()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Default.FiberManualRecord, contentDescription = null, tint = DColors.Red)
            Spacer(Modifier.width(8.dp))
            Text("Record Program (DVR)")
        }
    }
}
