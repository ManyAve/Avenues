package com.manyave.avenue

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight

/** The current theme's colour roles. [AvenueTheme] provides it. */
val LocalAvenueColors = staticCompositionLocalOf { AvenueTokens.Light }

/** Whether the current theme is dark. [AvenueTheme] provides it; a few roles differ by more than a colour in dark. */
val LocalAvenueDark = staticCompositionLocalOf { false }

/**
 * Avenue's look on Android. Puts Avenue's colour roles, type scale and corners into [MaterialTheme], so a stock
 * Material control (a text field, a switch, a dialog, a snackbar) takes Avenue's look with nothing wrapped, and
 * provides the roles Material has no slot for through [Avenue.colors].
 *
 * Wrap the app's content once, where its own theme is today.
 */
@Composable
fun AvenueTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val c = if (dark) AvenueTokens.Dark else AvenueTokens.Light
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.primary,
        onPrimary = c.primaryForeground,
        primaryContainer = c.primarySubtle,
        onPrimaryContainer = c.primarySubtleForeground,
        inversePrimary = c.primarySubtleForeground,
        secondary = c.secondary,
        onSecondary = c.secondaryForeground,
        secondaryContainer = c.primarySubtle,
        onSecondaryContainer = c.primarySubtleForeground,
        tertiary = c.info,
        onTertiary = c.infoForeground,
        tertiaryContainer = c.infoSubtle,
        onTertiaryContainer = c.infoSubtleForeground,
        background = c.background,
        onBackground = c.foreground,
        surface = c.background,
        onSurface = c.foreground,
        surfaceVariant = c.muted,
        onSurfaceVariant = c.mutedForeground,
        surfaceTint = c.background,
        surfaceBright = c.card,
        surfaceDim = c.muted,
        surfaceContainerLowest = c.background,
        surfaceContainerLow = c.card,
        surfaceContainer = c.card,
        surfaceContainerHigh = c.popover,
        surfaceContainerHighest = c.muted,
        inverseSurface = c.foreground,
        inverseOnSurface = c.background,
        outline = c.input,
        outlineVariant = c.border,
        error = c.destructive,
        onError = c.destructiveForeground,
        errorContainer = c.destructiveSubtle,
        onErrorContainer = c.destructiveSubtleForeground,
        scrim = c.foreground,
    )
    CompositionLocalProvider(LocalAvenueColors provides c, LocalAvenueDark provides dark) {
        MaterialTheme(colorScheme = scheme, typography = AvenueTypography, shapes = AvenueShapes, content = content)
    }
}

/** Avenue's roles inside an [AvenueTheme], named as on the web: `Avenue.colors.primarySubtle`. */
object Avenue {
    val colors: AvenueColors
        @Composable @ReadOnlyComposable get() = LocalAvenueColors.current

    val isDark: Boolean
        @Composable @ReadOnlyComposable get() = LocalAvenueDark.current
}

private fun AvenueTextStep.style(weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontSize = size, lineHeight = lineHeight, fontWeight = weight)

/** Avenue's type steps in Material's slots. Text on a phone is never under 14sp (Avenue's meta step). */
internal object AvenueText {
    val meta = AvenueTokens.TypeScale.meta.style()
    val compact = AvenueTokens.TypeScale.compact.style()

    /** A field error's size: 16sp on a phone, as the web's text-field below 768px. */
    val field = AvenueTokens.TypeScale.compact.style()
    val control = AvenueTokens.TypeScale.control.style(FontWeight.Medium)
}

private val AvenueTypography = Typography(
    displaySmall = AvenueTokens.TypeScale.display.style(FontWeight.SemiBold),
    headlineMedium = AvenueTokens.TypeScale.display.style(FontWeight.SemiBold),
    headlineSmall = AvenueTokens.TypeScale.heading.style(FontWeight.SemiBold),
    titleLarge = AvenueTokens.TypeScale.title.style(FontWeight.SemiBold),
    titleMedium = AvenueTokens.TypeScale.compact.style(FontWeight.SemiBold),
    titleSmall = AvenueTokens.TypeScale.control.style(FontWeight.Medium),
    bodyLarge = AvenueTokens.TypeScale.compact.style(),
    bodyMedium = AvenueTokens.TypeScale.compact.style(),
    bodySmall = AvenueTokens.TypeScale.meta.style(),
    labelLarge = AvenueTokens.TypeScale.control.style(FontWeight.Medium),
    labelMedium = AvenueTokens.TypeScale.meta.style(FontWeight.Medium),
    labelSmall = AvenueTokens.TypeScale.meta.style(FontWeight.Medium),
)

private val AvenueShapes = Shapes(
    extraSmall = RoundedCornerShape(AvenueTokens.Radius.sm),
    small = RoundedCornerShape(AvenueTokens.Radius.md),
    medium = RoundedCornerShape(AvenueTokens.Radius.lg),
    large = RoundedCornerShape(AvenueTokens.Radius.xl),
    extraLarge = RoundedCornerShape(AvenueTokens.Radius.xl),
)
