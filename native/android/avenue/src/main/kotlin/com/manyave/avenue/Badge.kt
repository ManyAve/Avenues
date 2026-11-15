package com.manyave.avenue

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Badge's looks, as on the web. */
enum class BadgeVariant { Default, Secondary, Destructive, Outline }

/**
 * A short label on a pill: "Board", "New". 20dp tall, Avenue's meta text in medium weight. A label, not a control;
 * for a status with meaning (paid, overdue) use [Status], which says it in words and colour.
 */
@Composable
fun Badge(text: String, modifier: Modifier = Modifier, variant: BadgeVariant = BadgeVariant.Default) {
    val c = Avenue.colors
    val (bg, fg) = when (variant) {
        BadgeVariant.Default -> c.primary to c.primaryForeground
        BadgeVariant.Secondary -> c.secondary to c.secondaryForeground
        BadgeVariant.Destructive -> c.destructive.copy(alpha = if (Avenue.isDark) 0.2f else 0.1f) to c.destructiveSubtleForeground
        BadgeVariant.Outline -> Color.Transparent to c.foreground
    }
    Pill(modifier.height(20.dp), bg, if (variant == BadgeVariant.Outline) c.border else Color.Transparent, PaddingValues(horizontal = 8.dp)) {
        // The web's box is 20px with a 20px line inside its border; a 16sp line keeps the glyphs centred, unclipped.
        Text(text, color = fg, style = AvenueText.meta.copy(fontWeight = FontWeight.Medium, lineHeight = 16.sp), maxLines = 1)
    }
}

/**
 * A pill with a 1dp border (transparent unless it shows), as the web's Badge box. A Compose border draws over the
 * content's edge instead of taking room as CSS's does, so the pill pads 1dp more to stay the web's size.
 */
@Composable
internal fun Pill(
    modifier: Modifier,
    background: Color,
    border: Color,
    padding: PaddingValues,
    content: @Composable RowScope.() -> Unit,
) {
    Row(
        modifier
            .background(background, CircleShape)
            .border(1.dp, border, CircleShape)
            .padding(1.dp)
            .padding(padding),
        horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.inline),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}
