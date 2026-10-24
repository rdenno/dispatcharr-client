package com.rdenno.dispatcharr.ui.stats

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Live Streams", "VOD Clients")

    // Poll live server stats every 3 seconds
    val statsLoadable = rememberLoadable(pollMs = 3000) {
        val streamStats = runCatching { App.api.get("/proxy/ts/status").asObj() }.getOrNull()
        val vodStats = runCatching { App.api.get("/proxy/vod/stats/").asObj() }.getOrNull()
        streamStats to vodStats
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Server Stats & Active Streams",
                subtitle = "Live Client Connections & Bandwidth"
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

            RefreshableBox(
                refreshing = statsLoadable.refreshing,
                onRefresh = { statsLoadable.reload() }
            ) {
                LoadableContent(statsLoadable) { (streamStats, vodStats) ->
                    if (selectedTab == 0) {
                        val channels = streamStats?.arr("channels")?.mapNotNull { it.asObj() } ?: emptyList()
                        if (channels.isEmpty()) {
                            EmptyBox("No active stream connections")
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = ListPadding,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(channels, key = { it.str("channel_id") ?: it.toString() }) { ch ->
                                    val name = ch.str("channel_name") ?: ch.str("name") ?: "Channel"
                                    val clients = ch.arr("clients")?.size ?: ch.int("client_count") ?: 0
                                    val bitrate = ch.double("bitrate") ?: 0.0
                                    val uptime = ch.long("uptime") ?: 0L

                                    ItemCard {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                    Badge("$clients clients", color = DColors.Teal)
                                                }
                                                Spacer(Modifier.height(4.dp))
                                                Text(
                                                    "Bitrate: ${Fmt.bitrate(bitrate)} • Uptime: ${Fmt.duration(uptime)}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = DColors.TextMuted
                                                )
                                            }

                                            IconButton(
                                                onClick = {
                                                    val chId = ch.str("channel_id") ?: ch.int("id")?.toString()
                                                    confirm.ask("Stop Stream", "Disconnect stream for $name?") {
                                                        action.run("Stream stopped") {
                                                            App.api.post("/proxy/ts/stop/$chId")
                                                            statsLoadable.reload()
                                                        }
                                                    }
                                                }
                                            ) {
                                                Icon(Icons.Default.Stop, contentDescription = "Stop", tint = DColors.Red)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // VOD clients
                        val vods = vodStats?.arr("connections")?.mapNotNull { it.asObj() } ?: emptyList()
                        if (vods.isEmpty()) {
                            EmptyBox("No active VOD playback sessions")
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = ListPadding,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                items(vods, key = { it.str("client_id") ?: it.toString() }) { v ->
                                    val title = v.str("title") ?: "VOD Stream"
                                    val ip = v.str("ip") ?: "Unknown IP"
                                    val clientId = v.str("client_id")

                                    ItemCard {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Text("Client IP: $ip", style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                            }

                                            IconButton(
                                                onClick = {
                                                    confirm.ask("Disconnect Client", "Disconnect VOD client $ip?") {
                                                        action.run("Client stopped") {
                                                            App.api.post("/proxy/vod/stop_client/", mapOf("client_id" to clientId))
                                                            statsLoadable.reload()
                                                        }
                                                    }
                                                }
                                            ) {
                                                Icon(Icons.Default.Stop, contentDescription = "Stop", tint = DColors.Red)
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
}
