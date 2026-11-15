package com.manyave.avenue

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/** EmptyState's sizes: default for a screen, compact inside a card on a phone. */
enum class EmptyStateSize { Default, Compact }

/** An empty state's way out: a label and what it does. */
data class EmptyAction(val label: String, val onClick: () -> Unit, val enabled: Boolean = true)

/**
 * An empty or failed screen, as the web's EmptyState: a muted icon, the title (a heading for TalkBack), one line on
 * why, then [action] as an outline button and [secondaryAction] as a quieter link under it. Say what happened and the
 * one way out; no status codes. Compact fits inside a card on a phone.
 */
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    description: String,
    modifier: Modifier = Modifier,
    action: EmptyAction? = null,
    secondaryAction: EmptyAction? = null,
    size: EmptyStateSize = EmptyStateSize.Default,
) {
    val c = Avenue.colors
    val pad = if (size == EmptyStateSize.Compact) Modifier.padding(horizontal = 16.dp, vertical = 24.dp) else Modifier.padding(horizontal = 24.dp, vertical = 48.dp)
    Column(modifier.fillMaxWidth().then(pad), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, contentDescription = null, Modifier.size(24.dp), tint = c.mutedForeground)
        Spacer(Modifier.height(12.dp))
        Text(
            title,
            Modifier.semantics { heading() },
            style = AvenueText.compact.copy(fontWeight = FontWeight.SemiBold),
            color = c.foreground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(AvenueTokens.Spacing.group))
        Text(description, style = AvenueText.compact, color = c.mutedForeground, textAlign = TextAlign.Center)
        if (action != null) {
            Spacer(Modifier.height(AvenueTokens.Spacing.inset))
            Button(action.label, action.onClick, variant = ButtonVariant.Outline, size = ButtonSize.Sm, enabled = action.enabled)
        }
        if (secondaryAction != null) {
            // 16dp on a phone, so the two buttons' tap areas meet but don't overlap, as the web's pointer-coarse gap.
            Spacer(Modifier.height(AvenueTokens.Spacing.controls))
            Button(secondaryAction.label, secondaryAction.onClick, variant = ButtonVariant.Link, size = ButtonSize.Sm, enabled = secondaryAction.enabled)
        }
    }
}
