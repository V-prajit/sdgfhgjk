import Foundation

// MARK: - Suit

enum Suit: String, Codable, CaseIterable, Comparable {
    case hearts = "Hearts"
    case diamonds = "Diamonds"
    case clubs = "Clubs"
    case spades = "Spades"

    var symbol: String {
        switch self {
        case .hearts: return "\u{2665}"
        case .diamonds: return "\u{2666}"
        case .clubs: return "\u{2663}"
        case .spades: return "\u{2660}"
        }
    }

    var color: String {
        switch self {
        case .hearts, .diamonds: return "red"
        case .clubs, .spades: return "black"
        }
    }

    static func < (lhs: Suit, rhs: Suit) -> Bool {
        let order: [Suit] = [.clubs, .diamonds, .hearts, .spades]
        return order.firstIndex(of: lhs)! < order.firstIndex(of: rhs)!
    }
}

// MARK: - Rank

/// Card ranks used in 28. The game only uses 7, 8, 9, 10, J, Q, K, A.
/// Strength order (high to low): J, 9, A, 10, K, Q, 8, 7
enum Rank: String, Codable, CaseIterable {
    case seven = "7"
    case eight = "8"
    case nine = "9"
    case ten = "10"
    case jack = "J"
    case queen = "Q"
    case king = "K"
    case ace = "A"

    /// Point value in the 28 card game.
    var points: Int {
        switch self {
        case .jack: return 3
        case .nine: return 2
        case .ace: return 1
        case .ten: return 1
        case .king, .queen, .eight, .seven: return 0
        }
    }

    /// Strength ranking for trick comparison (higher = stronger).
    var strength: Int {
        switch self {
        case .jack: return 8
        case .nine: return 7
        case .ace: return 6
        case .ten: return 5
        case .king: return 4
        case .queen: return 3
        case .eight: return 2
        case .seven: return 1
        }
    }

    /// All ranks used in the 28 card game.
    static var gameRanks: [Rank] {
        [.seven, .eight, .nine, .ten, .jack, .queen, .king, .ace]
    }
}

// MARK: - Card

struct Card: Codable, Identifiable, Equatable, Hashable {
    let suit: Suit
    let rank: Rank

    var id: String { "\(rank.rawValue)\(suit.symbol)" }
    var points: Int { rank.points }
    var strength: Int { rank.strength }

    var displayName: String {
        "\(rank.rawValue)\(suit.symbol)"
    }

    var fullName: String {
        "\(rank.rawValue) of \(suit.rawValue)"
    }

    static func == (lhs: Card, rhs: Card) -> Bool {
        lhs.suit == rhs.suit && lhs.rank == rhs.rank
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(suit)
        hasher.combine(rank)
    }
}

// MARK: - Deck

struct Deck {
    /// Creates the standard 32-card deck for the 28 game.
    static func standard28Deck() -> [Card] {
        var cards: [Card] = []
        for suit in Suit.allCases {
            for rank in Rank.gameRanks {
                cards.append(Card(suit: suit, rank: rank))
            }
        }
        return cards
    }

    /// Shuffles and deals cards to 4 players.
    /// In 28, cards are dealt in two phases:
    /// Phase 1: 4 cards each (for bidding)
    /// Phase 2: 4 more cards each (after trump is set)
    static func deal(phase: DealPhase) -> [[Card]] {
        var deck = standard28Deck().shuffled()
        var hands: [[Card]] = [[], [], [], []]

        switch phase {
        case .firstDeal:
            // Deal 4 cards to each player
            for playerIndex in 0..<4 {
                for _ in 0..<4 {
                    if let card = deck.popLast() {
                        hands[playerIndex].append(card)
                    }
                }
            }
        case .fullDeal:
            // Deal all 8 cards to each player at once
            for playerIndex in 0..<4 {
                for _ in 0..<8 {
                    if let card = deck.popLast() {
                        hands[playerIndex].append(card)
                    }
                }
            }
        }

        return hands
    }
}

enum DealPhase {
    case firstDeal   // 4 cards each for bidding
    case fullDeal    // All 8 cards
}
