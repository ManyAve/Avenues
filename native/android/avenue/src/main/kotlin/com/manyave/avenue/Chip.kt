package com.manyave.avenue

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.unit.dp

/**
 * A filter chip: Material's FilterChip (TalkBack reads it as a checkbox with its state) in Avenue's look. Selected is
 * Avenue's one "chosen" look, the primary border, the primary-subtle fill and its text, plus a check, so colour never
 * carries the state alone. The check replaces [icon] while selected; the chip grows to fit it, as on the web.
 * [count] follows the label, slightly quieter ("Overdue 3").
 */
@Composable
fun Chip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    count: Int? = null,
    icon: ImageVector? = null,
    enabled: Boolean = true,
) {
    val c = Avenue.colors
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                buildAnnotatedString {
                    append(text)
                    if (count != null) {
                        append(" ")
                        withStyle(SpanStyle(fontFeatureSettings = "tnum")) { append(count.toString()) }
                    }
                },
                style = AvenueText.control.copy(fontWeight = FontWeight.Normal),
                maxLines = 1,
                overflow = TextOverflow.Visible,
            )
        },
        modifier = modifier.height(AvenueTokens.Spacing.controlMd),
        enabled = enabled,
        leadingIcon = when {
            selected -> ({ Icon(AvenueIcons.Check, contentDescription = null, Modifier.size(16.dp)) })
            icon != null -> ({ Icon(icon, contentDescription = null, Modifier.size(16.dp)) })
            else -> null
        },
        shape = CircleShape,
        colors = FilterChipDefaults.filterChipColors(
            containerColor = c.background,
            labelColor = c.mutedForeground,
            iconColor = c.mutedForeground,
            selectedContainerColor = c.primarySubtle,
            selectedLabelColor = c.primarySubtleForeground,
            selectedLeadingIconColor = c.primarySubtleForeground,
        ),
        border = FilterChipDefaults.filterChipBorder(
            enabled = enabled,
            selected = selected,
            borderColor = c.border,
            selectedBorderColor = c.primary,
            borderWidth = 1.dp,
            selectedBorderWidth = 1.dp,
        ),
    )
}

/** How a [ChipRow] fits more chips than its width: onto more lines, or along one line that scrolls. */
enum class ChipRowOverflow { Wrap, Scroll }

/**
 * A row of chips, [AvenueTokens.Spacing.controls] apart so their tap areas don't overlap. [ChipRowOverflow.Wrap] (the
 * default) wraps; [ChipRowOverflow.Scroll] keeps one line for a phone's filter bar. Chips never shrink or truncate.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChipRow(
    modifier: Modifier = Modifier,
    overflow: ChipRowOverflow = ChipRowOverflow.Wrap,
    content: @Composable RowScope.() -> Unit,
) {
    val gap = Arrangement.spacedBy(AvenueTokens.Spacing.controls)
    when (overflow) {
        ChipRowOverflow.Wrap -> FlowRow(modifier, horizontalArrangement = gap, verticalArrangement = gap, content = content)
        ChipRowOverflow.Scroll -> Row(
            modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = gap,
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}
