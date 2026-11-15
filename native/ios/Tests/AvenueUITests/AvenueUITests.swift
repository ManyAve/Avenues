import XCTest
@testable import AvenueUI

/// The rules the components share with the web, checked against the web's own answers (src/lib/format.ts).
final class AvenueUITests: XCTestCase {
    func testInitialsMatchTheWeb() {
        XCTAssertEqual(avenueInitials("Avery Quinn"), "AQ")
        XCTAssertEqual(avenueInitials("avery"), "A")
        XCTAssertEqual(avenueInitials("  Jordan   Lee  Park"), "JL")
        XCTAssertEqual(avenueInitials("3rd Street Group"), "SG")
        XCTAssertEqual(avenueInitials("émile zola"), "ÉZ")
        XCTAssertEqual(avenueInitials(""), "")
    }

    /// The web's `tintFor` for the same keys (FNV-1a, teal plum stone iris), worked out with
    /// `bun -e 'import {tintFor} from "./src/lib/format.ts"; …'`.
    func testTintsMatchTheWeb() {
        let expected: [String: AvenueTint] = WebTints.expected
        for (key, tint) in expected {
            XCTAssertEqual(AvenueTint.of(key), tint, key)
        }
    }

    func testTapAreaReachesTheMinimum() {
        XCTAssertEqual(hitOutset(32) * 2 + 32, 44)
        XCTAssertEqual(hitOutset(48), 0)
    }

    func testEveryCatalogSlugHasAView() {
        XCTAssertEqual(Set(AvenueCatalog.slugs).count, AvenueCatalog.slugs.count)
    }
}

enum WebTints {
    static let expected: [String: AvenueTint] = [
        "Avery Quinn": .plum,
        "Sam Ortiz": .teal,
        "Riley Park": .stone,
        "Morgan Diaz": .iris,
        "Maple Court": .plum,
        "person_01H8": .stone,
        "émile zola": .iris,
        "👩‍🌾 Kim": .stone,
        "": .plum,
    ]
}
