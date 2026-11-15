package com.manyave.avenue

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** Card's sizes, as on the web: default insets 16dp, sm 12dp. */
enum class CardSize(internal val spacing: Dp) { Default(16.dp), Sm(12.dp) }

/** The parts a [Card] lays out: [CardHeader], then [CardContent]. The footer is the card's `footer` slot. */
class CardScope internal constructor(internal val spacing: Dp, column: ColumnScope) : ColumnScope by column

/**
 * Avenue's Card: the xl corner (14dp), the card colour and a 1dp hairline in the text colour at 10%, as the web's
 * ring. Its parts sit [CardSize] apart and inset. [footer] is a band at the card's foot for its actions, as the web's
 * CardFooter: a hairline above, the muted colour at half strength, and it meets the card's bottom edge.
 */
@Composable
fun Card(
    modifier: Modifier = Modifier,
    size: CardSize = CardSize.Default,
    footer: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable CardScope.() -> Unit,
) {
    val c = Avenue.colors
    val shape = RoundedCornerShape(AvenueTokens.Radius.xl)
    CompositionLocalProvider(LocalContentColor provides c.cardForeground) {
        ProvideTextStyle(AvenueText.compact) {
            Column(
                modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(c.card)
                    .border(1.dp, c.foreground.copy(alpha = 0.1f), shape)
                    .padding(top = size.spacing, bottom = if (footer != null) 0.dp else size.spacing),
                verticalArrangement = Arrangement.spacedBy(size.spacing),
            ) {
                CardScope(size.spacing, this).content()
                if (footer != null) CardFooter(size.spacing, footer)
            }
        }
    }
}

/**
 * The card's title, an optional description under it, and an optional [action] (a select, a button) on the title's
 * line, centred on it. Controls in a card header use the sm size, as on the web. TalkBack reads the title as a heading.
 */
@Composable
fun CardScope.CardHeader(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    action: (@Composable RowScope.() -> Unit)? = null,
) {
    Column(modifier.fillMaxWidth().padding(horizontal = spacing), verticalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.inline)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.group)) {
            Text(
                title,
                Modifier.weight(1f).semantics { heading() },
                style = AvenueText.compact.copy(fontWeight = FontWeight.Medium),
            )
            if (action != null) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.controls),
                    verticalAlignment = Alignment.CenterVertically,
                    content = action,
                )
            }
        }
        if (description != null) Text(description, color = Avenue.colors.mutedForeground)
    }
}

/** The card's body, inset from its sides. */
@Composable
fun CardScope.CardContent(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier.fillMaxWidth().padding(horizontal = spacing), content = content)
}

@Composable
private fun CardFooter(spacing: Dp, content: @Composable RowScope.() -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        HorizontalDivider(color = Avenue.colors.border, thickness = 1.dp)
        Row(
            Modifier
                .fillMaxWidth()
                .background(Avenue.colors.muted.copy(alpha = 0.5f))
                .padding(spacing),
            horizontalArrangement = Arrangement.spacedBy(AvenueTokens.Spacing.controls),
            verticalAlignment = Alignment.CenterVertically,
            content = content,
        )
    }
}
