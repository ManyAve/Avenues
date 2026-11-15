package com.manyave.avenue

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/** What a status means. The label says it; the colour only repeats it. */
enum class StatusTone { Success, Warning, Primary, Info, Neutral }

/**
 * A status label: an outlined pill with a coloured dot, or with [filled] a tinted pill, as the web's Status. Always
 * pass words: colour alone never carries the state (WCAG 1.4.1). 24dp tall, the meta line plus 1dp padding and a 1dp
 * border, so outlined and filled labels line up in a list.
 */
@Composable
fun Status(text: String, tone: StatusTone, modifier: Modifier = Modifier, filled: Boolean = false) {
    val c = Avenue.colors
    val (bg, fg) = if (!filled) {
        c.background to c.mutedForeground
    } else {
        when (tone) {
            StatusTone.Success -> c.successSubtle to c.successSubtleForeground
            StatusTone.Warning -> c.warningSubtle to c.warningSubtleForeground
            StatusTone.Primary -> c.primarySubtle to c.primarySubtleForeground
            StatusTone.Info -> c.infoSubtle to c.infoSubtleForeground
            StatusTone.Neutral -> c.slateSubtle to c.slateSubtleForeground
        }
    }
    Pill(modifier, bg, if (filled) Color.Transparent else c.border, PaddingValues(horizontal = 8.dp, vertical = 1.dp)) {
        if (!filled) Spacer(Modifier.size(6.dp).background(tone.dot(), CircleShape))
        // Weight 450 on the web; Android's system font has no 450, so it is the nearest, Normal.
        Text(text, color = fg, style = AvenueText.meta.copy(fontWeight = FontWeight.Normal), maxLines = 1)
    }
}

@Composable
private fun StatusTone.dot(): Color {
    val c = Avenue.colors
    return when (this) {
        StatusTone.Success -> c.success
        StatusTone.Warning -> c.warning
        StatusTone.Primary -> c.primary
        StatusTone.Info -> c.info
        StatusTone.Neutral -> c.slateSubtleForeground
    }
}
