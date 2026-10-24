package com.rdenno.dispatcharr.ui.vods

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
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
fun VodsScreen() {
    val nav = LocalNavigator.current
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Movies", "Series")

    var searchQuery by remember { mutableStateOf("") }
    var selectedItem by remember { mutableStateOf<JsonObject?>(null) }

    val vodContent = rememberLoadable(selectedTab, searchQuery) {
        val q = mutableMapOf<String, Any?>()
        if (searchQuery.isNotBlank()) q["search"] = searchQuery

        if (selectedTab == 0) {
            App.api.get("/api/vod/movies/", q).resultsList()
        } else {
            App.api.get("/api/vod/series/", q).resultsList()
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "VOD Library",
                subtitle = if (selectedTab == 0) "Movies on Demand" else "TV Series on Demand"
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

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                SearchField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = if (selectedTab == 0) "Search movies..." else "Search series..."
                )
            }

            RefreshableBox(
                refreshing = vodContent.refreshing,
                onRefresh = { vodContent.reload() }
            ) {
                LoadableContent(vodContent) { items ->
                    if (items.isEmpty()) {
                        EmptyBox("No VOD content found")
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 150.dp),
                            contentPadding = ListPadding,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(items, key = { it.int("id") ?: it.toString() }) { item ->
                                val name = item.str("name") ?: item.str("title") ?: "Untitled"
                                val poster = item.str("poster_path") ?: item.str("cover") ?: item.str("logo_url")
                                val rating = item.double("rating") ?: item.double("vote_average")

                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { selectedItem = item },
                                    colors = CardDefaults.cardColors(containerColor = DColors.Surface)
                                ) {
                                    Column {
                                        RemoteImage(
                                            url = poster,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(200.dp),
                                            contentScale = ContentScale.Crop
                                        )
                                        Column(modifier = Modifier.padding(8.dp)) {
                                            Text(
                                                name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = FontWeight.SemiBold,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            if (rating != null && rating > 0.0) {
                                                Text(
                                                    "★ ${String.format("%.1f", rating)}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = DColors.Orange
                                                )
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

    selectedItem?.let { item ->
        VodDetailsDialog(
            item = item,
            isMovie = selectedTab == 0,
            onDismiss = { selectedItem = null },
            onPlay = { url, title ->
                nav.play(url, title, live = false)
                selectedItem = null
            }
        )
    }
}

@Composable
fun VodDetailsDialog(
    item: JsonObject,
    isMovie: Boolean,
    onDismiss: () -> Unit,
    onPlay: (url: String, title: String) -> Unit
) {
    val title = item.str("name") ?: item.str("title") ?: "VOD Details"
    val plot = item.str("plot") ?: item.str("overview") ?: item.str("description")
    val poster = item.str("poster_path") ?: item.str("cover") ?: item.str("logo_url")
    val year = item.str("release_date")?.take(4) ?: item.str("year")
    val streamUrl = item.str("stream_url") ?: "/proxy/vod/stream/${item.int("id")}"

    FullScreenDialog(
        title = title,
        onDismiss = onDismiss,
        actions = {
            if (isMovie) {
                IconButton(onClick = { onPlay(streamUrl, title) }) {
                    Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = DColors.Teal)
                }
            }
        }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            RemoteImage(
                url = poster,
                modifier = Modifier
                    .width(100.dp)
                    .height(150.dp),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (year != null) {
                    Text(year, style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                }
                Spacer(Modifier.height(8.dp))
                if (isMovie) {
                    Button(
                        onClick = { onPlay(streamUrl, title) },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("Play Movie")
                    }
                }
            }
        }

        if (!plot.isNullOrBlank()) {
            Spacer(Modifier.height(12.dp))
            Text("Synopsis", style = MaterialTheme.typography.titleSmall, color = DColors.TextMuted)
            Text(plot, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
