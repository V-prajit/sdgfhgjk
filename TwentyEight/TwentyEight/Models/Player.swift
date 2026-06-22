import Foundation
import MultipeerConnectivity

// MARK: - Team

enum Team: Int, Codable, CaseIterable {
    case teamA = 0
    case teamB = 1

    var name: String {
        switch self {
        case .teamA: return "Team A"
        case .teamB: return "Team B"
        }
    }

    var otherTeam: Team {
        self == .teamA ? .teamB : .teamA
    }
}

// MARK: - PlayerPosition

/// Seat positions at the table. Partners sit opposite each other.
/// North-South = Team A, East-West = Team B
enum PlayerPosition: Int, Codable, CaseIterable {
    case north = 0
    case east = 1
    case south = 2
    case west = 3

    var name: String {
        switch self {
        case .north: return "North"
        case .east: return "East"
        case .south: return "South"
        case .west: return "West"
        }
    }

    var team: Team {
        switch self {
        case .north, .south: return .teamA
        case .east, .west: return .teamB
        }
    }

    var partner: PlayerPosition {
        switch self {
        case .north: return .south
        case .east: return .west
        case .south: return .north
        case .west: return .east
        }
    }

    var next: PlayerPosition {
        PlayerPosition(rawValue: (rawValue + 1) % 4)!
    }
}

// MARK: - Player

struct Player: Codable, Identifiable, Equatable {
    let id: String
    var name: String
    var position: PlayerPosition
    var hand: [Card]
    var isHost: Bool

    var team: Team { position.team }

    var sortedHand: [Card] {
        hand.sorted { lhs, rhs in
            if lhs.suit != rhs.suit {
                return lhs.suit < rhs.suit
            }
            return lhs.strength > rhs.strength
        }
    }

    func hasCardOfSuit(_ suit: Suit) -> Bool {
        hand.contains { $0.suit == suit }
    }

    func cardsOfSuit(_ suit: Suit) -> [Card] {
        hand.filter { $0.suit == suit }
    }

    static func == (lhs: Player, rhs: Player) -> Bool {
        lhs.id == rhs.id
    }
}
