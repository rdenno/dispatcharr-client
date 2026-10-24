package com.rdenno.dispatcharr.ui.logs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogsScreen() {
    val logsList = rememberLoadable {
        App.api.get("/api/core/logs/").resultsList()
    }

    var selectedLogName by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "System & Server Logs",
                subtitle = "Diagnostic Logs & Event Traces"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            RefreshableBox(
                refreshing = logsList.refreshing,
                onRefresh = { logsList.reload() }
            ) {
                LoadableContent(logsList) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No system logs found")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.str("name") ?: it.toString() }) { log ->
                                val name = log.str("name") ?: "log.txt"
                                val size = log.long("size")

                                ItemCard(onClick = { selectedLogName = name }) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            Icon(Icons.Default.Description, contentDescription = null, tint = DColors.Teal)
                                            Column {
                                                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                if (size != null) {
                                                    Text(Fmt.bytes(size), style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                                }
                                            }
                                        }

                                        Button(onClick = { selectedLogName = name }) {
                                            Text("View")
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

    selectedLogName?.let { name ->
        LogViewerDialog(name = name, onDismiss = { selectedLogName = null })
    }
}

@Composable
fun LogViewerDialog(name: String, onDismiss: () -> Unit) {
    val logContent = rememberLoadable(name) {
        App.api.getText("/api/core/logs/${java.net.URLEncoder.encode(name, "UTF-8")}/")
    }

    FullScreenDialog(
        title = name,
        onDismiss = onDismiss,
        actions = {
            IconButton(onClick = { logContent.reload() }) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = DColors.Teal)
            }
        },
        scrollable = false,
        contentPadding = 8.dp
    ) {
        LoadableContent(logContent) { text ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(8.dp)
            ) {
                Text(
                    text = text.ifBlank { "(Log file is empty)" },
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    color = DColors.TextSecondary
                )
            }
        }
    }
}
