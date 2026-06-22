import Foundation

// MARK: - Game Phase

enum GamePhase: String, Codable {
    case waitingForPlayers
    case dealing
    case bidding
    case selectingTrump
    case playing
    case trickComplete
    case roundComplete
    case gameOver
}

// MARK: - Bid

struct Bid: Codable, Equatable {
    let playerPosition: PlayerPosition
    let amount: Int
}

// MARK: - Trick

struct Trick: Codable {
    var cards: [(position: PlayerPosition, card: Card)]
    var leadSuit: Suit?
    var winnerPosition: PlayerPosition?
    var points: Int

    init() {
        cards = []
        leadSuit = nil
        winnerPosition = nil
        points = 0
    }

    var isComplete: Bool { cards.count == 4 }

    enum CodingKeys: String, CodingKey {
        case cardsData, leadSuit, winnerPosition, points
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        let cardsData = cards.map { TrickCard(position: $0.position, card: $0.card) }
        try container.encode(cardsData, forKey: .cardsData)
        try container.encodeIfPresent(leadSuit, forKey: .leadSuit)
        try container.encodeIfPresent(winnerPosition, forKey: .winnerPosition)
        try container.encode(points, forKey: .points)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let cardsData = try container.decode([TrickCard].self, forKey: .cardsData)
        cards = cardsData.map { ($0.position, $0.card) }
        leadSuit = try container.decodeIfPresent(Suit.self, forKey: .leadSuit)
        winnerPosition = try container.decodeIfPresent(PlayerPosition.self, forKey: .winnerPosition)
        points = try container.decode(Int.self, forKey: .points)
    }
}

struct TrickCard: Codable {
    let position: PlayerPosition
    let card: Card
}

// MARK: - Round Score

struct RoundScore: Codable {
    var teamAPoints: Int = 0
    var teamBPoints: Int = 0
    var teamATricks: Int = 0
    var teamBTricks: Int = 0
}

// MARK: - Game State

struct GameState: Codable {
    var phase: GamePhase = .waitingForPlayers
    var players: [Player] = []
    var currentDealer: PlayerPosition = .north
    var currentTurn: PlayerPosition = .east

    // Bidding
    var bids: [Bid] = []
    var currentBidder: PlayerPosition = .east
    var highestBid: Bid?
    var passedPlayers: Set<Int> = [] // raw values of positions that passed
    var minimumBid: Int = 14

    // Trump
    var trumpSuit: Suit?
    var trumpRevealed: Bool = false
    var trumpCallerPosition: PlayerPosition?

    // Tricks
    var currentTrick: Trick = Trick()
    var completedTricks: [Trick] = []
    var roundScore: RoundScore = RoundScore()

    // Overall game score
    var teamAGameScore: Int = 0
    var teamBGameScore: Int = 0
    var targetScore: Int = 6 // First team to 6 wins

    // Second deal tracking
    var secondDealHands: [[Card]]?
    var hasDealtSecondRound: Bool = false

    // Round tracking
    var roundNumber: Int = 1

    var totalTricksPlayed: Int { completedTricks.count }

    func player(at position: PlayerPosition) -> Player? {
        players.first { $0.position == position }
    }

    var biddingTeam: Team? {
        trumpCallerPosition?.team
    }

    var defendingTeam: Team? {
        guard let bidding = biddingTeam else { return nil }
        return bidding.otherTeam
    }
}
