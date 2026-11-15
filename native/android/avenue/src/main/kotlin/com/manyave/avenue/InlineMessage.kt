package com.manyave.avenue

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/**
 * What an [InlineMessage] says. Error is announced at once (assertive): something failed and needs attention.
 * Warning, info and pending are announced politely, when TalkBack is free.
 */
enum class InlineMessageTone { Error, Warning, Info, Pending }

/**
 * A one-line message beside the thing it is about: a form error, "Saving…", a warning under a field, as the web's
 * InlineMessage. The icon stays so colour never carries the state alone; [hideIcon] drops it under a field whose own
 * error state already shows it.
 *
 * TalkBack announces a live region when its text changes. Keep one InlineMessage in place and change its [text];
 * null keeps the region in the tree with nothing to say, so the next message is still announced.
 */
@Composable
fun InlineMessage(
    text: String?,
    modifier: Modifier = Modifier,
    tone: InlineMessageTone = InlineMessageTone.Error,
    hideIcon: Boolean = false,
) {
    val c = Avenue.colors
    val color = when (tone) {
        InlineMessageTone.Error -> c.destructiveSubtleForeground
        InlineMessageTone.Warning -> c.warningSubtleForeground
        InlineMessageTone.Info, InlineMessageTone.Pending -> c.mutedForeground
    }
    val icon = when (tone) {
        InlineMessageTone.Error -> AvenueIcons.CircleAlert
        InlineMessageTone.Warning -> AvenueIcons.TriangleAlert
        InlineMessageTone.Info -> AvenueIcons.Info
        InlineMessageTone.Pending -> AvenueIcons.LoaderCircle
    }
    val live = if (tone == InlineMessageTone.Error) LiveRegionMode.Assertive else LiveRegionMode.Polite
    Row(
        modifier.semantics(mergeDescendants = true) { liveRegion = live },
        horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.inline),
    ) {
        if (text.isNullOrEmpty()) return@Row
        if (!hideIcon) {
            // One line tall, so the icon sits on the first line.
            val line = with(LocalDensity.current) { AvenueText.field.lineHeight.toDp() }
            Box(Modifier.height(line), contentAlignment = Alignment.Center) {
                Icon(
                    icon,
                    contentDescription = null,
                    Modifier.size(16.dp).then(if (tone == InlineMessageTone.Pending) Modifier.spinning() else Modifier),
                    tint = color,
                )
            }
        }
        Text(text, style = AvenueText.field, color = color)
    }
}

/** Turns once a second, as the web's animate-spin. Android's "Remove animations" setting stops it at the system level. */
@Composable
private fun Modifier.spinning(): Modifier {
    val angle by rememberInfiniteTransition(label = "pending").animateFloat(
        0f, 360f, infiniteRepeatable(tween(1000, easing = LinearEasing), RepeatMode.Restart), label = "spin",
    )
    return rotate(angle)
}
