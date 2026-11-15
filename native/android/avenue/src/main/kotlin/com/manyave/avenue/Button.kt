package com.manyave.avenue

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Button's looks, as on the web. `destructive` is a tinted button, not a solid red one. */
enum class ButtonVariant { Default, Outline, Secondary, Ghost, Destructive, Link }

/**
 * Button's sizes. Heights are Avenue's phone control heights: xs and sm 28dp, default 32dp, lg 40dp. However small it
 * looks, Compose takes a tap across Android's 48dp minimum around it, which is more than Avenue's 44 floor; keep
 * [AvenueTokens.Spacing.controls] between two buttons so those areas don't overlap.
 */
enum class ButtonSize(
    internal val height: Dp,
    internal val corner: Dp,
    internal val padding: Dp,
    internal val icon: Dp,
    internal val square: Boolean = false,
) {
    Xs(AvenueTokens.Spacing.controlXs, AvenueTokens.Radius.md, 8.dp, 12.dp),
    Sm(AvenueTokens.Spacing.controlSm, AvenueTokens.Radius.md, 8.dp, 14.dp),
    Default(AvenueTokens.Spacing.controlMd, AvenueTokens.Radius.lg, 12.dp, 16.dp),
    Lg(AvenueTokens.Spacing.controlLg, AvenueTokens.Radius.lg, 12.dp, 16.dp),

    /** Square, for an icon alone: the web's icon-xs, icon-sm, icon and icon-lg. */
    IconXs(AvenueTokens.Spacing.controlXs, AvenueTokens.Radius.md, 0.dp, 12.dp, square = true),
    IconSm(AvenueTokens.Spacing.controlSm, AvenueTokens.Radius.md, 0.dp, 16.dp, square = true),
    Icon(AvenueTokens.Spacing.controlMd, AvenueTokens.Radius.lg, 0.dp, 16.dp, square = true),
    IconLg(AvenueTokens.Spacing.controlLg, AvenueTokens.Radius.lg, 0.dp, 16.dp, square = true),
}

/**
 * Avenue's Button: Material's Button (its ripple, focus, TalkBack role and disabled state) in Avenue's look.
 *
 * [disabledReason] says why the action is unavailable. It disables the button, shows the reason as one muted line
 * under it, and TalkBack reads it with the button ("Send, Add a subject first, Button, disabled"), as the web's
 * aria-describedby does.
 */
@Composable
fun Button(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Default,
    size: ButtonSize = ButtonSize.Default,
    enabled: Boolean = true,
    disabledReason: String? = null,
    content: @Composable RowScope.() -> Unit,
) {
    if (disabledReason == null) {
        AvenueButton(onClick, modifier, variant, size, enabled, null, content)
        return
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.inline)) {
        AvenueButton(onClick, Modifier, variant, size, false, disabledReason, content)
        Text(
            disabledReason,
            Modifier.clearAndSetSemantics { },
            style = AvenueText.meta,
            color = Avenue.colors.mutedForeground,
        )
    }
}

/** A button with a text label and an optional icon before it. */
@Composable
fun Button(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Default,
    size: ButtonSize = ButtonSize.Default,
    enabled: Boolean = true,
    disabledReason: String? = null,
    icon: ImageVector? = null,
) = Button(onClick, modifier, variant, size, enabled, disabledReason) {
    if (icon != null) Icon(icon, contentDescription = null, Modifier.size(size.icon))
    // The web underlines a link only on hover, which a phone doesn't have, so it stays plain.
    Text(text)
}

/**
 * A button that is only an icon. [contentDescription] is what TalkBack reads ("Add household"); it is required, since
 * the icon alone names nothing.
 */
@Composable
fun Button(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Outline,
    size: ButtonSize = ButtonSize.Icon,
    enabled: Boolean = true,
) = Button(onClick, modifier.semantics { this.contentDescription = contentDescription }, variant, size, enabled) {
    Icon(icon, contentDescription = null, Modifier.size(size.icon))
}

@Composable
private fun AvenueButton(
    onClick: () -> Unit,
    modifier: Modifier,
    variant: ButtonVariant,
    size: ButtonSize,
    enabled: Boolean,
    reason: String?,
    content: @Composable RowScope.() -> Unit,
) {
    val c = Avenue.colors
    val dark = Avenue.isDark
    val (container, contentColor) = when (variant) {
        ButtonVariant.Default -> c.primary to c.primaryForeground
        ButtonVariant.Outline -> c.background to c.foreground
        ButtonVariant.Secondary -> c.secondary to c.secondaryForeground
        ButtonVariant.Ghost -> Color.Transparent to c.foreground
        ButtonVariant.Destructive -> c.destructive.copy(alpha = if (dark) 0.2f else 0.1f) to c.destructiveSubtleForeground
        // Dark: primary text is 3.2:1 on the dark page, so a link uses the subtle-foreground tone there, as on the web.
        ButtonVariant.Link -> Color.Transparent to if (dark) c.primarySubtleForeground else c.primary
    }
    // Disabled is the enabled look at half opacity, as the web's disabled:opacity-50.
    val colors = ButtonDefaults.buttonColors(
        containerColor = container,
        contentColor = contentColor,
        disabledContainerColor = container.copy(alpha = container.alpha * 0.5f),
        disabledContentColor = contentColor.copy(alpha = 0.5f),
    )
    val border = if (variant == ButtonVariant.Outline) {
        BorderStroke(1.dp, if (enabled) c.border else c.border.copy(alpha = 0.5f))
    } else {
        null
    }
    androidx.compose.material3.Button(
        onClick = onClick,
        modifier = modifier
            .height(size.height)
            .then(if (size.square) Modifier.width(size.height) else Modifier)
            // Material's 58dp minimum width only applies when nothing sets one; the web has none, so a short label
            // stays short. At least square, so an icon button is round-cornered, not a sliver.
            .widthIn(min = size.height)
            .then(if (reason != null) Modifier.semantics { stateDescription = reason } else Modifier),
        enabled = enabled,
        shape = RoundedCornerShape(size.corner),
        colors = colors,
        elevation = null,
        border = border,
        contentPadding = PaddingValues(horizontal = if (variant == ButtonVariant.Link) 0.dp else size.padding),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.inline), verticalAlignment = Alignment.CenterVertically) {
            ProvideTextStyle(AvenueText.control) { content() }
        }
    }
}
