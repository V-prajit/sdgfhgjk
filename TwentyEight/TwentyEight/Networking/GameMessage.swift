import Foundation

// MARK: - Game Message

/// All messages exchanged between peers during the game.
enum GameMessage: Codable {
    // Lobby
    case playerJoined(playerName: String, playerId: String)
    case assignPosition(playerId: String, position: PlayerPosition)
    case lobbyUpdate(playerNames: [String], positions: [PlayerPosition])
    case startGame

    // Dealing
    case dealCards(hands: [[Card]], dealerPosition: PlayerPosition)
    case secondDeal(hands: [[Card]])

    // Bidding
    case placeBid(position: PlayerPosition, amount: Int)
    case passBid(position: PlayerPosition)
    case biddingComplete(winnerPosition: PlayerPosition, amount: Int)

    // Trump
    case setTrump(suit: Suit, callerPosition: PlayerPosition)
    case revealTrump(suit: Suit)
    case requestTrumpReveal(requestingPosition: PlayerPosition)

    // Playing
    case playCard(position: PlayerPosition, card: Card)
    case trickResult(winnerPosition: PlayerPosition, points: Int, trick: Trick)

    // Game flow
    case roundResult(teamAPoints: Int, teamBPoints: Int, bidMet: Bool)
    case gameOver(winningTeam: Team, teamAScore: Int, teamBScore: Int)
    case newRound(dealerPosition: PlayerPosition)

    // Sync
    case fullStateSync(state: GameState)
    case heartbeat(from: PlayerPosition)

    // Validation
    case invalidMove(reason: String, position: PlayerPosition)

    func encoded() -> Data? {
        try? JSONEncoder().encode(self)
    }

    static func decoded(from data: Data) -> GameMessage? {
        try? JSONDecoder().decode(GameMessage.self, from: data)
    }
}
