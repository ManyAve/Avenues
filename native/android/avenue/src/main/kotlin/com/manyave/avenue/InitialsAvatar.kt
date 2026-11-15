package com.manyave.avenue

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** InitialsAvatar's sizes, as on the web: sm 28dp, default 32dp. */
enum class AvatarSize(internal val size: Dp) { Sm(28.dp), Default(32.dp) }

/** The four decorative tints. They carry no status meaning. */
enum class Tint { Teal, Plum, Stone, Iris }

/**
 * A person's initials on their tint, as the web's InitialsAvatar. [tintKey] picks the tint: pass the person's stable
 * id, so they keep one colour on every screen and on the web, even when their name is written differently; it falls
 * back to the name.
 *
 * TalkBack reads the name, not the initials. When the name is shown beside the avatar, pass [decorative] so it is
 * read once.
 */
@Composable
fun InitialsAvatar(
    name: String,
    modifier: Modifier = Modifier,
    tintKey: String? = null,
    size: AvatarSize = AvatarSize.Sm,
    decorative: Boolean = false,
) {
    val (bg, fg) = tintColors(tintFor(tintKey ?: name))
    Box(
        modifier
            .size(size.size)
            .background(bg, CircleShape)
            .clearAndSetSemantics {
                if (!decorative) {
                    contentDescription = name
                    role = Role.Image
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            initials(name),
            color = fg,
            // Weight 550 on the web; Android's system font steps from 500 to 600, so Medium.
            style = AvenueText.meta.copy(fontWeight = FontWeight.Medium, letterSpacing = 0.2.sp),
            maxLines = 1,
        )
    }
}

@Composable
private fun tintColors(tint: Tint): Pair<Color, Color> {
    val c = Avenue.colors
    return when (tint) {
        Tint.Teal -> c.tintTealBg to c.tintTealFg
        Tint.Plum -> c.tintPlumBg to c.tintPlumFg
        Tint.Stone -> c.tintStoneBg to c.tintStoneFg
        Tint.Iris -> c.tintIrisBg to c.tintIrisFg
    }
}

/**
 * The tint for a key, by the web's FNV-1a hash (Avenue's src/lib/format.ts `tintFor`), so a person has the same
 * colour in every app. Like the web, it hashes the first UTF-16 unit of each code point.
 */
fun tintFor(key: String): Tint {
    var h = 2166136261L
    var i = 0
    while (i < key.length) {
        h = h xor key[i].code.toLong()
        h = (h * 16777619L) and 0xFFFFFFFFL
        i += Character.charCount(key.codePointAt(i))
    }
    return Tint.entries[(h % Tint.entries.size).toInt()]
}

/** First letter of the first two words that start with a letter, in any script, as the web's `initials`. */
fun initials(name: String): String =
    Regex("(?<=^|\\s)\\p{L}").findAll(name).take(2).joinToString("") { it.value }.uppercase()
