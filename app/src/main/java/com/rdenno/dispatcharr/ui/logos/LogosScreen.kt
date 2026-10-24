package com.rdenno.dispatcharr.ui.logos

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CleaningServices
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LogosScreen() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    var searchQuery by remember { mutableStateOf("") }

    val logosLoadable = rememberLoadable(searchQuery) {
        val q = if (searchQuery.isNotBlank()) mapOf("search" to searchQuery) else emptyMap()
        App.api.get("/api/channels/logos/", q).resultsList()
    }

    val filePicker = rememberFilePicker { picked ->
        action.run("Logo uploaded") {
            App.api.multipart(
                path = "/api/channels/logos/upload/",
                fields = mapOf("name" to picked.name),
                files = listOf(FilePart("file", picked.name, picked.bytes, picked.mime))
            )
            logosLoadable.reload()
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Logo Manager",
                subtitle = "Channel & Station Logos"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SearchField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.weight(1f),
                    placeholder = "Search logos..."
                )
                Button(onClick = { filePicker.launch("image/*") }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Upload")
                }
                IconButton(
                    onClick = {
                        confirm.ask("Cleanup Unused", "Remove all unassigned logos from disk?") {
                            action.run("Cleanup completed") {
                                App.api.post("/api/channels/logos/cleanup/", mapOf("delete_files" to true))
                                logosLoadable.reload()
                            }
                        }
                    }
                ) {
                    Icon(Icons.Default.CleaningServices, contentDescription = "Cleanup", tint = DColors.Orange)
                }
            }

            RefreshableBox(
                refreshing = logosLoadable.refreshing,
                onRefresh = { logosLoadable.reload() }
            ) {
                LoadableContent(logosLoadable) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No logos found")
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 110.dp),
                            contentPadding = ListPadding,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.int("id") ?: it.toString() }) { logo ->
                                val name = logo.str("name") ?: "Logo"
                                val url = logo.str("url") ?: logo.str("path")
                                val id = logo.int("id")

                                ItemCard {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        RemoteImage(url = url, modifier = Modifier.size(64.dp))
                                        Spacer(Modifier.height(6.dp))
                                        Text(
                                            name,
                                            style = MaterialTheme.typography.bodySmall,
                                            fontWeight = FontWeight.Medium,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        IconButton(
                                            onClick = {
                                                confirm.ask("Delete Logo", "Delete logo '$name'?") {
                                                    action.run("Logo deleted") {
                                                        App.api.delete("/api/channels/logos/$id/")
                                                        logosLoadable.reload()
                                                    }
                                                }
                                            },
                                            modifier = Modifier.size(28.dp)
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
