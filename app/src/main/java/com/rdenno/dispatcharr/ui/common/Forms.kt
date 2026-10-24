package com.rdenno.dispatcharr.ui.common

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.ui.theme.DColors

@Composable
fun TextInput(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    description: String? = null,
    singleLine: Boolean = true,
    minLines: Int = 1,
    enabled: Boolean = true,
    error: String? = null,
    placeholder: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = singleLine,
        minLines = minLines,
        enabled = enabled,
        isError = error != null,
        placeholder = placeholder?.let { { Text(it) } },
        supportingText = (error ?: description)?.let { { Text(it, color = if (error != null) DColors.Red else DColors.TextMuted) } },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
    )
}

@Composable
fun TextAreaInput(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, description: String? = null, minLines: Int = 3) =
    TextInput(label, value, onValueChange, modifier, description, singleLine = false, minLines = minLines)

@Composable
fun PasswordInput(label: String, value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier, description: String? = null) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        supportingText = description?.let { { Text(it, color = DColors.TextMuted) } },
        trailingIcon = {
            IconButton(onClick = { visible = !visible }) {
                Icon(if (visible) Icons.Default.VisibilityOff else Icons.Default.Visibility, "Toggle visibility")
            }
        },
    )
}

/** Integer input; empty string -> null. */
@Composable
fun IntInput(
    label: String,
    value: Int?,
    onValueChange: (Int?) -> Unit,
    modifier: Modifier = Modifier,
    description: String? = null,
    enabled: Boolean = true,
) {
    var text by remember(value) { mutableStateOf(value?.toString() ?: "") }
    TextInput(
        label, text,
        onValueChange = { t ->
            val filtered = t.filter { it.isDigit() || it == '-' }
            text = filtered
            onValueChange(filtered.toIntOrNull())
        },
        modifier = modifier, description = description, enabled = enabled, keyboardType = KeyboardType.Number,
    )
}

/** Decimal input; empty string -> null. */
@Composable
fun DecimalInput(label: String, value: Double?, onValueChange: (Double?) -> Unit, modifier: Modifier = Modifier, description: String? = null) {
    var text by remember { mutableStateOf(value?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: "") }
    TextInput(
        label, text,
        onValueChange = { t ->
            val filtered = t.filter { it.isDigit() || it == '.' || it == '-' }
            text = filtered
            onValueChange(filtered.toDoubleOrNull())
        },
        modifier = modifier, description = description, keyboardType = KeyboardType.Decimal,
    )
}

@Composable
fun SwitchRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    description: String? = null,
    enabled: Boolean = true,
) {
    Row(
        modifier.fillMaxWidth().clickable(enabled = enabled) { onCheckedChange(!checked) }.padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            if (description != null) Text(description, style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange, enabled = enabled)
    }
}

@Composable
fun CheckboxRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Row(
        modifier.fillMaxWidth().clickable(enabled = enabled) { onCheckedChange(!checked) }.padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = checked, onCheckedChange = onCheckedChange, enabled = enabled)
        Text(label)
    }
}

/** Option for [SelectField]/[MultiSelectField]. */
data class Option<T>(val value: T, val label: String)

/**
 * Dropdown select (web: Mantine Select). Set [noneLabel] to allow choosing null.
 * Use [searchable] for long lists – opens a searchable dialog instead of a menu.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> SelectField(
    label: String,
    options: List<Option<T>>,
    selected: T?,
    onSelect: (T?) -> Unit,
    modifier: Modifier = Modifier,
    noneLabel: String? = null,
    description: String? = null,
    enabled: Boolean = true,
    searchable: Boolean = options.size > 15,
) {
    val current = options.firstOrNull { it.value == selected }?.label ?: (if (selected == null) noneLabel ?: "" else selected.toString())
    var expanded by remember { mutableStateOf(false) }
    if (searchable) {
        OutlinedTextField(
            value = current, onValueChange = {}, readOnly = true, enabled = enabled,
            label = { Text(label) },
            trailingIcon = { Icon(Icons.Default.ArrowDropDown, null) },
            supportingText = description?.let { { Text(it, color = DColors.TextMuted) } },
            modifier = modifier.fillMaxWidth(),
            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
                .also { src ->
                    androidx.compose.runtime.LaunchedEffect(src) {
                        src.interactions.collect { if (it is androidx.compose.foundation.interaction.PressInteraction.Release && enabled) expanded = true }
                    }
                },
        )
        if (expanded) {
            SearchablePickerDialog(label, options, selected, noneLabel, onDismiss = { expanded = false }) { onSelect(it); expanded = false }
        }
        return
    }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { if (enabled) expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = current, onValueChange = {}, readOnly = true, enabled = enabled,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            supportingText = description?.let { { Text(it, color = DColors.TextMuted) } },
            modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            if (noneLabel != null) {
                DropdownMenuItem(text = { Text(noneLabel, color = DColors.TextMuted) }, onClick = { onSelect(null); expanded = false })
            }
            options.forEach { o ->
                DropdownMenuItem(text = { Text(o.label) }, onClick = { onSelect(o.value); expanded = false })
            }
        }
    }
}

@Composable
private fun <T> SearchablePickerDialog(
    title: String,
    options: List<Option<T>>,
    selected: T?,
    noneLabel: String?,
    onDismiss: () -> Unit,
    onPick: (T?) -> Unit,
) {
    var q by remember { mutableStateOf("") }
    val filtered = remember(q, options) { if (q.isBlank()) options else options.filter { it.label.contains(q, true) } }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column {
                SearchField(q, { q = it })
                LazyColumn(Modifier.heightIn(max = 420.dp)) {
                    if (noneLabel != null) item {
                        Row(Modifier.fillMaxWidth().clickable { onPick(null) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = selected == null, onClick = { onPick(null) }); Text(noneLabel, color = DColors.TextMuted)
                        }
                    }
                    items(filtered) { o ->
                        Row(Modifier.fillMaxWidth().clickable { onPick(o.value) }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(selected = o.value == selected, onClick = { onPick(o.value) }); Text(o.label)
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}

/** Multi-select (web: Mantine MultiSelect) – opens a searchable checkbox dialog. */
@Composable
fun <T> MultiSelectField(
    label: String,
    options: List<Option<T>>,
    selected: Set<T>,
    onChange: (Set<T>) -> Unit,
    modifier: Modifier = Modifier,
    description: String? = null,
    enabled: Boolean = true,
) {
    var open by remember { mutableStateOf(false) }
    val summary = options.filter { it.value in selected }.joinToString(", ") { it.label }
    OutlinedTextField(
        value = if (summary.isEmpty()) "" else summary,
        onValueChange = {}, readOnly = true, enabled = enabled,
        label = { Text(label) },
        placeholder = { Text("None selected") },
        trailingIcon = { Icon(Icons.Default.ArrowDropDown, null) },
        supportingText = description?.let { { Text(it, color = DColors.TextMuted) } },
        maxLines = 2,
        modifier = modifier.fillMaxWidth(),
        interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
            .also { src ->
                androidx.compose.runtime.LaunchedEffect(src) {
                    src.interactions.collect { if (it is androidx.compose.foundation.interaction.PressInteraction.Release && enabled) open = true }
                }
            },
    )
    if (open) {
        var q by remember { mutableStateOf("") }
        var working by remember { mutableStateOf(selected) }
        val filtered = remember(q, options) { if (q.isBlank()) options else options.filter { it.label.contains(q, true) } }
        AlertDialog(
            onDismissRequest = { open = false },
            title = { Text(label) },
            text = {
                Column {
                    SearchField(q, { q = it })
                    Row {
                        TextButton(onClick = { working = working + filtered.map { it.value } }) { Text("Select all") }
                        TextButton(onClick = { working = working - filtered.map { it.value }.toSet() }) { Text("Clear") }
                    }
                    LazyColumn(Modifier.heightIn(max = 400.dp)) {
                        items(filtered) { o ->
                            CheckboxRow(o.label, o.value in working, { c -> working = if (c) working + o.value else working - o.value })
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { onChange(working); open = false }) { Text("Done") } },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } },
        )
    }
}

/** Segmented choice among a few string options (web: SegmentedControl / Radio group). */
@Composable
fun <T> RadioGroup(label: String?, options: List<Option<T>>, selected: T?, onSelect: (T) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier) {
        if (label != null) Text(label, style = MaterialTheme.typography.labelLarge, color = DColors.TextSecondary)
        options.forEach { o ->
            Row(Modifier.fillMaxWidth().clickable { onSelect(o.value) }, verticalAlignment = Alignment.CenterVertically) {
                RadioButton(selected = o.value == selected, onClick = { onSelect(o.value) })
                Text(o.label)
            }
        }
    }
}
