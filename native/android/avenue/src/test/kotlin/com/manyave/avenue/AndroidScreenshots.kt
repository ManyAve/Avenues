package com.manyave.avenue

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import com.android.ide.common.rendering.api.SessionParams
import org.junit.Rule
import org.junit.Test

/**
 * The Android column of Avenue's side-by-side component stories. Each test is one story slug, shared with the iPhone
 * screenshots, rendered in light and dark on a 390dp phone with a 16dp page inset, as the iPhone and web columns. The content of
 * each slug is the shared catalog's (/mnt/project-files/avenue/native/catalog-content.md). `bun run native:android` records them and copies them to
 * native/screenshots/android/<slug>-<light|dark>.png. Fictional data only.
 */
class AndroidScreenshots {
    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_5,
        renderingMode = SessionParams.RenderingMode.SHRINK,
        showSystemUi = false,
        maxPercentDifference = 0.0,
    )

    private fun shot(slug: String, content: @Composable ColumnScope.() -> Unit) {
        for (dark in listOf(false, true)) {
            paparazzi.snapshot("$slug-${if (dark) "dark" else "light"}") {
                AvenueTheme(dark = dark) {
                    Column(
                        Modifier.width(390.dp).background(Avenue.colors.background).padding(AvenueTokens.Spacing.page),
                        verticalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.controls),
                        content = content,
                    )
                }
            }
        }
    }

    @Test fun buttonVariants() = shot("button-variants") {
        Button("Record payment", {})
        Button("Export", {}, variant = ButtonVariant.Outline)
        Button("Add note", {}, variant = ButtonVariant.Secondary)
        Button("Skip", {}, variant = ButtonVariant.Ghost)
        Button("Delete", {}, variant = ButtonVariant.Destructive)
        Button("View history", {}, variant = ButtonVariant.Link)
    }

    @Test fun buttonSizes() = shot("button-sizes") {
        Wrap(AvenueTokens.Spacing.controls) {
            // Each on a line as tall as the largest, centred, as the web's items-center row.
            Line { Button("Extra small", {}, size = ButtonSize.Xs) }
            Line { Button("Small", {}, size = ButtonSize.Sm) }
            Line { Button("Default", {}) }
            Line { Button("Large", {}, size = ButtonSize.Lg) }
            Line { Button(AvenueIcons.Plus, "Add household", {}) }
        }
    }

    @Test fun buttonDisabledReason() = shot("button-disabled-reason") {
        Button("Send notices", {}, disabledReason = "Add a mailing address first.")
    }

    @Test fun badgeVariants() = shot("badge-variants") {
        Wrap(AvenueTokens.Spacing.group) {
            Badge("Paid")
            Badge("Draft", variant = BadgeVariant.Secondary)
            Badge("Past due", variant = BadgeVariant.Destructive)
            Badge("12 households", variant = BadgeVariant.Outline)
        }
    }

    @Test fun statusTones() = shot("status-tones") { statuses(filled = false) }

    @Test fun statusFilled() = shot("status-filled") { statuses(filled = true) }

    @Composable
    private fun statuses(filled: Boolean) = Wrap(AvenueTokens.Spacing.group) {
        Status("Paid", StatusTone.Success, filled = filled)
        Status("Partial", StatusTone.Warning, filled = filled)
        Status("Scheduled", StatusTone.Primary, filled = filled)
        Status("Sent", StatusTone.Info, filled = filled)
        Status("Archived", StatusTone.Neutral, filled = filled)
    }

    @Test fun chipStates() = shot("chip-states") {
        ChipRow {
            Chip("Open", selected = false, onClick = {}, count = 4)
            Chip("Closed", selected = true, onClick = {}, count = 12)
            Chip("Mine", selected = false, onClick = {})
        }
    }

    @Test fun chipRow() = shot("chip-row") {
        ChipRow {
            Chip("All", selected = false, onClick = {})
            Chip("Paid", selected = false, onClick = {}, count = 31)
            Chip("Partial", selected = false, onClick = {}, count = 3)
            Chip("Past due", selected = true, onClick = {}, count = 6)
            Chip("Credit", selected = false, onClick = {}, count = 2)
            Chip("Archived", selected = false, onClick = {})
        }
    }

    @Test fun initialsAvatarSizes() = shot("initials-avatar-sizes") {
        for (size in AvatarSize.entries) {
            Wrap(AvenueTokens.Spacing.group) {
                for (p in listOf("Sam Ortiz", "Avery Quinn", "Riley Park", "Morgan Diaz")) InitialsAvatar(p, size = size)
            }
        }
    }

    @Composable
    private fun duesCard(size: CardSize, footer: Boolean) = Card(
        size = size,
        footer = if (footer) ({ Button("Request dues", {}) }) else null,
    ) {
        CardHeader(
            "Dues 2026",
            description = "Billed March 1",
            action = { Button("Edit", {}, variant = ButtonVariant.Outline, size = ButtonSize.Sm) },
        )
        CardContent { Text("$240.00 per household · 42 households") }
    }

    @Test fun cardDefault() = shot("card-default") { duesCard(CardSize.Default, footer = true) }

    @Test fun cardSm() = shot("card-sm") { duesCard(CardSize.Sm, footer = false) }

    @Test fun emptyStateDefault() = shot("empty-state-default") {
        EmptyState(
            AvenueIcons.Inbox,
            "No complaints yet",
            "Complaints neighbors file show up here.",
            action = EmptyAction("New complaint", {}),
        )
    }

    @Test fun emptyStateCompact() = shot("empty-state-compact") {
        EmptyState(
            AvenueIcons.Inbox,
            "No payments",
            "Payments recorded for this household show up here.",
            size = EmptyStateSize.Compact,
        )
    }

    @Test fun inlineMessageTones() = shot("inline-message-tones") {
        InlineMessage("Couldn't save. Check your connection and try again.", tone = InlineMessageTone.Error)
        InlineMessage("This household has no mailing address.", tone = InlineMessageTone.Warning)
        InlineMessage("Changes save automatically.", tone = InlineMessageTone.Info)
        InlineMessage("Saving…", tone = InlineMessageTone.Pending)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Wrap(gap: Dp, content: @Composable () -> Unit) = FlowRow(
    horizontalArrangement = Arrangement.spacedBy(gap),
    verticalArrangement = Arrangement.spacedBy(gap),
) { content() }

@Composable
private fun Line(content: @Composable () -> Unit) =
    Box(Modifier.height(AvenueTokens.Spacing.controlLg), contentAlignment = Alignment.Center) { content() }
