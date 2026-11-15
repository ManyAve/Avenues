package com.manyave.avenue

import org.junit.Assert.assertEquals
import org.junit.Test

/** A person's tint and initials match the web's (src/lib/format.ts), so they look the same in every app. */
class WebParityTest {
    // Expected values printed by the web's tintFor and initials.
    private val cases = listOf(
        Triple("Ada Park", Tint.Plum, "AP"),
        Triple("Jordan Reyes", Tint.Iris, "JR"),
        Triple("Sam Okafor", Tint.Teal, "SO"),
        Triple("Lee Moreau", Tint.Teal, "LM"),
        Triple("household_8f2a", Tint.Teal, "H"),
        Triple("Zoë Ångström", Tint.Iris, "ZÅ"),
        Triple("😀 Smile", Tint.Teal, "S"),
        Triple("josé  maría", Tint.Teal, "JM"),
        Triple("", Tint.Plum, ""),
    )

    @Test fun tintMatchesWeb() {
        for ((key, tint, _) in cases) assertEquals(key, tint, tintFor(key))
    }

    @Test fun initialsMatchWeb() {
        for ((name, _, letters) in cases) assertEquals(name, letters, initials(name))
    }
}
