import Foundation
import Combine
import MultipeerConnectivity

// MARK: - Game Engine

/// Central game engine managing all state transitions, validation, and P2P sync.
/// The host is authoritative: it validates moves, resolves tricks, and broadcasts state.
/// Clients send actions; the host processes and broadcasts results.
class GameEngine: ObservableObject {

    // MARK: - Published State

    @Published var gameState: GameState = GameState()
    @Published var myPosition: PlayerPosition = .north
    @Published var errorMessage: String?
    @Published var showError: Bool = false
    @Published var animatingTrick: Bool = false

    // MARK: - Dependencies

    let multipeerService: MultipeerService
    var isHost: Bool { multipeerService.isHosting }

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init(multipeerService: MultipeerService) {
        self.multipeerService = multipeerService
        setupMessageHandling()
    }

    // MARK: - Message Handling

    private func setupMessageHandling() {
        multipeerService.onMessageReceived = { [weak self] message, peerID in
            self?.handleMessage(message, from: peerID)
        }
    }

    private func handleMessage(_ message: GameMessage, from peerID: MCPeerID) {
        switch message {

        // Lobby
        case .playerJoined(let name, let playerId):
            handlePlayerJoined(name: name, id: playerId, peerID: peerID)

        case .assignPosition(let playerId, let position):
            handlePositionAssigned(playerId: playerId, position: position)

        case .lobbyUpdate(let names, let positions):
            handleLobbyUpdate(names: names, positions: positions)

        case .startGame:
            handleStartGame()

        // Dealing
        case .dealCards(let hands, let dealerPosition):
            handleDealCards(hands: hands, dealer: dealerPosition)

        case .secondDeal(let hands):
            handleSecondDeal(hands: hands)

        // Bidding
        case .placeBid(let position, let amount):
            if isHost {
                handleBidFromPeer(position: position, amount: amount)
            } else {
                applyBid(position: position, amount: amount)
            }

        case .passBid(let position):
            if isHost {
                handlePassFromPeer(position: position)
            } else {
                applyPass(position: position)
            }

        case .biddingComplete(let winner, let amount):
            handleBiddingComplete(winner: winner, amount: amount)

        // Trump
        case .setTrump(let suit, let callerPosition):
            handleTrumpSet(suit: suit, caller: callerPosition)

        case .revealTrump(let suit):
            handleTrumpRevealed(suit: suit)

        case .requestTrumpReveal(let requestingPosition):
            if isHost { handleTrumpRevealRequest(from: requestingPosition) }

        // Playing
        case .playCard(let position, let card):
            if isHost {
                handlePlayCardFromPeer(position: position, card: card)
            } else {
                applyPlayCard(position: position, card: card)
            }

        case .trickResult(let winner, let points, let trick):
            handleTrickResult(winner: winner, points: points, trick: trick)

        // Game flow
        case .roundResult(let teamA, let teamB, let bidMet):
            handleRoundResult(teamA: teamA, teamB: teamB, bidMet: bidMet)

        case .gameOver(let winningTeam, let teamAScore, let teamBScore):
            handleGameOver(winner: winningTeam, teamAScore: teamAScore, teamBScore: teamBScore)

        case .newRound(let dealer):
            handleNewRound(dealer: dealer)

        // Sync
        case .fullStateSync(let state):
            gameState = state

        case .heartbeat:
            break

        case .invalidMove(let reason, _):
            showErrorMessage(reason)
        }
    }

    // MARK: - Lobby

    func createGame(playerName: String) {
        multipeerService.startHosting()
        myPosition = .north
        let host = Player(
            id: multipeerService.myPeerID.displayName,
            name: playerName,
            position: .north,
            hand: [],
            isHost: true
        )
        gameState.players = [host]
        gameState.phase = .waitingForPlayers
        multipeerService.peerPositionMap[playerName] = .north
    }

    func joinGame(playerName: String) {
        multipeerService.startBrowsing()
    }

    func connectToHost(_ hostPeerID: MCPeerID) {
        multipeerService.joinHost(hostPeerID)
        // Send join message after a brief delay to ensure connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            guard let self = self else { return }
            let msg = GameMessage.playerJoined(
                playerName: self.multipeerService.myPeerID.displayName,
                playerId: self.multipeerService.myPeerID.displayName
            )
            self.multipeerService.sendToAll(msg)
        }
    }

    private func handlePlayerJoined(name: String, id: String, peerID: MCPeerID) {
        guard isHost else { return }
        guard gameState.players.count < 4 else { return }

        let nextPosition = nextAvailablePosition()
        let newPlayer = Player(
            id: id,
            name: name,
            position: nextPosition,
            hand: [],
            isHost: false
        )
        gameState.players.append(newPlayer)
        multipeerService.peerPositionMap[peerID.displayName] = nextPosition

        // Notify the new player of their position
        multipeerService.send(.assignPosition(playerId: id, position: nextPosition), to: [peerID])

        // Broadcast lobby update to all
        broadcastLobbyUpdate()
    }

    private func handlePositionAssigned(playerId: String, position: PlayerPosition) {
        myPosition = position
    }

    private func handleLobbyUpdate(names: [String], positions: [PlayerPosition]) {
        // Rebuild players list from lobby data
        var updatedPlayers: [Player] = []
        for i in 0..<names.count {
            let player = Player(
                id: names[i],
                name: names[i],
                position: positions[i],
                hand: gameState.player(at: positions[i])?.hand ?? [],
                isHost: positions[i] == .north
            )
            updatedPlayers.append(player)
        }
        gameState.players = updatedPlayers
    }

    private func broadcastLobbyUpdate() {
        let names = gameState.players.map { $0.name }
        let positions = gameState.players.map { $0.position }
        multipeerService.sendToAll(.lobbyUpdate(playerNames: names, positions: positions))
    }

    private func nextAvailablePosition() -> PlayerPosition {
        let taken = Set(gameState.players.map { $0.position })
        let order: [PlayerPosition] = [.east, .south, .west]
        return order.first { !taken.contains($0) } ?? .north
    }

    // MARK: - Start Game

    func startGameAsHost() {
        guard isHost, gameState.players.count == 4 else { return }
        multipeerService.sendToAll(.startGame)
        handleStartGame()
    }

    private func handleStartGame() {
        gameState.phase = .dealing
        if isHost {
            dealFirstRound()
        }
    }

    // MARK: - Dealing

    private func dealFirstRound() {
        let deck = Deck.standard28Deck().shuffled()
        var firstHands: [[Card]] = [[], [], [], []]
        var secondHands: [[Card]] = [[], [], [], []]

        // Split deck: first 4 cards for each player, then next 4
        for i in 0..<4 {
            for j in 0..<4 {
                firstHands[j].append(deck[i * 4 + j])
            }
            for j in 0..<4 {
                secondHands[j].append(deck[16 + i * 4 + j])
            }
        }

        // Store second deal for later
        gameState.secondDealHands = secondHands

        // Assign first deal hands
        for position in PlayerPosition.allCases {
            if let idx = gameState.players.firstIndex(where: { $0.position == position }) {
                gameState.players[idx].hand = firstHands[position.rawValue]
            }
        }

        gameState.phase = .bidding
        gameState.currentBidder = gameState.currentDealer.next
        gameState.bids = []
        gameState.passedPlayers = []
        gameState.highestBid = nil
        gameState.minimumBid = 14

        // Send each player only their own cards
        for position in PlayerPosition.allCases {
            var handsForPlayer: [[Card]] = [[], [], [], []]
            handsForPlayer[position.rawValue] = firstHands[position.rawValue]

            if position == myPosition {
                continue // Host already has their cards
            }

            if let peerID = multipeerService.peerID(for: position) {
                multipeerService.send(
                    .dealCards(hands: handsForPlayer, dealerPosition: gameState.currentDealer),
                    to: [peerID]
                )
            }
        }
    }

    private func handleDealCards(hands: [[Card]], dealer: PlayerPosition) {
        gameState.currentDealer = dealer
        // Find our cards from the hands array
        let ourHand = hands[myPosition.rawValue]
        if let idx = gameState.players.firstIndex(where: { $0.position == myPosition }) {
            gameState.players[idx].hand = ourHand
        }
        gameState.phase = .bidding
        gameState.currentBidder = dealer.next
        gameState.bids = []
        gameState.passedPlayers = []
        gameState.highestBid = nil
        gameState.minimumBid = 14
    }

    // MARK: - Bidding

    func placeBid(amount: Int) {
        if isHost {
            handleBidFromPeer(position: myPosition, amount: amount)
        } else {
            multipeerService.sendToAll(.placeBid(position: myPosition, amount: amount))
        }
    }

    func passBid() {
        if isHost {
            handlePassFromPeer(position: myPosition)
        } else {
            multipeerService.sendToAll(.passBid(position: myPosition))
        }
    }

    private func handleBidFromPeer(position: PlayerPosition, amount: Int) {
        guard gameState.phase == .bidding else { return }
        guard position == gameState.currentBidder else {
            sendInvalidMove("It's not your turn to bid", to: position)
            return
        }
        guard amount >= gameState.minimumBid, amount <= 28 else {
            sendInvalidMove("Bid must be between \(gameState.minimumBid) and 28", to: position)
            return
        }

        applyBid(position: position, amount: amount)

        // Broadcast to all peers
        multipeerService.sendToAll(.placeBid(position: position, amount: amount))

        advanceBidding()
    }

    private func handlePassFromPeer(position: PlayerPosition) {
        guard gameState.phase == .bidding else { return }
        guard position == gameState.currentBidder else {
            sendInvalidMove("It's not your turn to bid", to: position)
            return
        }

        applyPass(position: position)

        multipeerService.sendToAll(.passBid(position: position))

        advanceBidding()
    }

    private func applyBid(position: PlayerPosition, amount: Int) {
        let bid = Bid(playerPosition: position, amount: amount)
        gameState.bids.append(bid)
        gameState.highestBid = bid
        gameState.minimumBid = amount + 1
    }

    private func applyPass(position: PlayerPosition) {
        gameState.passedPlayers.insert(position.rawValue)
    }

    private func advanceBidding() {
        guard isHost else { return }

        // Count active bidders (not passed)
        let activeBidders = PlayerPosition.allCases.filter {
            !gameState.passedPlayers.contains($0.rawValue)
        }

        // If only one active bidder remains and they have bid, bidding is done
        if activeBidders.count == 1, let highBid = gameState.highestBid {
            completeBidding(winner: highBid.playerPosition, amount: highBid.amount)
            return
        }

        // If all have passed without a bid (shouldn't happen normally)
        if activeBidders.isEmpty {
            // Re-deal
            dealFirstRound()
            return
        }

        // Move to next active bidder
        var next = gameState.currentBidder.next
        while gameState.passedPlayers.contains(next.rawValue) {
            next = next.next
            if next == gameState.currentBidder {
                // Wrapped around, all others passed
                if let highBid = gameState.highestBid {
                    completeBidding(winner: highBid.playerPosition, amount: highBid.amount)
                }
                return
            }
        }
        gameState.currentBidder = next
    }

    private func completeBidding(winner: PlayerPosition, amount: Int) {
        gameState.phase = .selectingTrump
        gameState.trumpCallerPosition = winner
        gameState.highestBid = Bid(playerPosition: winner, amount: amount)
        multipeerService.sendToAll(.biddingComplete(winnerPosition: winner, amount: amount))
    }

    private func handleBiddingComplete(winner: PlayerPosition, amount: Int) {
        gameState.phase = .selectingTrump
        gameState.trumpCallerPosition = winner
        gameState.highestBid = Bid(playerPosition: winner, amount: amount)
    }

    // MARK: - Trump Selection

    func selectTrump(suit: Suit) {
        guard myPosition == gameState.trumpCallerPosition else { return }

        gameState.trumpSuit = suit
        gameState.trumpRevealed = false

        if isHost {
            dealSecondRoundAndStartPlaying()
        } else {
            multipeerService.sendToAll(.setTrump(suit: suit, callerPosition: myPosition))
        }
    }

    private func handleTrumpSet(suit: Suit, caller: PlayerPosition) {
        gameState.trumpSuit = suit
        gameState.trumpCallerPosition = caller
        gameState.trumpRevealed = false

        if isHost {
            dealSecondRoundAndStartPlaying()
        }
    }

    private func dealSecondRoundAndStartPlaying() {
        guard isHost, let secondHands = gameState.secondDealHands else { return }

        // Give remaining cards to players
        for position in PlayerPosition.allCases {
            if let idx = gameState.players.firstIndex(where: { $0.position == position }) {
                gameState.players[idx].hand.append(contentsOf: secondHands[position.rawValue])
            }

            if position == myPosition { continue }

            var handsForPlayer: [[Card]] = [[], [], [], []]
            handsForPlayer[position.rawValue] = secondHands[position.rawValue]
            if let peerID = multipeerService.peerID(for: position) {
                multipeerService.send(.secondDeal(hands: handsForPlayer), to: [peerID])
            }
        }

        gameState.hasDealtSecondRound = true
        gameState.phase = .playing
        // The player to the right of dealer leads first trick
        gameState.currentTurn = gameState.currentDealer.next
        gameState.currentTrick = Trick()
    }

    private func handleSecondDeal(hands: [[Card]]) {
        let additionalCards = hands[myPosition.rawValue]
        if let idx = gameState.players.firstIndex(where: { $0.position == myPosition }) {
            gameState.players[idx].hand.append(contentsOf: additionalCards)
        }
        gameState.hasDealtSecondRound = true
        gameState.phase = .playing
        gameState.currentTurn = gameState.currentDealer.next
        gameState.currentTrick = Trick()
    }

    // MARK: - Playing Cards

    func playCard(_ card: Card) {
        if isHost {
            handlePlayCardFromPeer(position: myPosition, card: card)
        } else {
            multipeerService.sendToAll(.playCard(position: myPosition, card: card))
        }
    }

    private func handlePlayCardFromPeer(position: PlayerPosition, card: Card) {
        guard gameState.phase == .playing else { return }
        guard position == gameState.currentTurn else {
            sendInvalidMove("It's not your turn", to: position)
            return
        }

        // Validate the card play
        if let error = validateCardPlay(card: card, by: position) {
            sendInvalidMove(error, to: position)
            return
        }

        applyPlayCard(position: position, card: card)
        multipeerService.sendToAll(.playCard(position: position, card: card))

        // Check if trick is complete
        if gameState.currentTrick.isComplete {
            resolveTrick()
        } else {
            gameState.currentTurn = gameState.currentTurn.next
        }
    }

    private func applyPlayCard(position: PlayerPosition, card: Card) {
        // Remove card from player's hand
        if let idx = gameState.players.firstIndex(where: { $0.position == position }) {
            gameState.players[idx].hand.removeAll { $0 == card }
        }

        // Set lead suit if first card in trick
        if gameState.currentTrick.cards.isEmpty {
            gameState.currentTrick.leadSuit = card.suit
        }

        // Add card to current trick
        gameState.currentTrick.cards.append((position: position, card: card))

        if !gameState.currentTrick.isComplete {
            gameState.currentTurn = position.next
        }
    }

    // MARK: - Card Validation

    func validateCardPlay(card: Card, by position: PlayerPosition) -> String? {
        guard let player = gameState.player(at: position) else {
            return "Player not found"
        }

        // Check player has the card
        guard player.hand.contains(card) else {
            return "You don't have that card"
        }

        // If not the first card, must follow suit if possible
        if let leadSuit = gameState.currentTrick.leadSuit {
            if card.suit != leadSuit && player.hasCardOfSuit(leadSuit) {
                return "You must follow suit (\(leadSuit.rawValue))"
            }

            // If player can't follow suit and plays a non-trump card,
            // check if trump reveal is needed
            if card.suit != leadSuit && !player.hasCardOfSuit(leadSuit) {
                if !gameState.trumpRevealed && card.suit == gameState.trumpSuit {
                    // Playing trump when can't follow suit reveals trump
                    gameState.trumpRevealed = true
                    if let trump = gameState.trumpSuit {
                        multipeerService.sendToAll(.revealTrump(suit: trump))
                    }
                }
            }
        }

        return nil
    }

    /// Returns cards that are valid to play from the current player's hand.
    func validCardsToPlay() -> [Card] {
        guard let player = gameState.player(at: myPosition) else { return [] }
        guard gameState.currentTurn == myPosition else { return [] }

        if let leadSuit = gameState.currentTrick.leadSuit {
            let suitCards = player.cardsOfSuit(leadSuit)
            if !suitCards.isEmpty {
                return suitCards
            }
            // Can play any card if can't follow suit
            return player.hand
        }

        // Leading the trick - can play any card
        return player.hand
    }

    // MARK: - Trick Resolution

    private func resolveTrick() {
        guard isHost, gameState.currentTrick.isComplete else { return }

        let trick = gameState.currentTrick
        guard let leadSuit = trick.leadSuit else { return }

        var winningPosition = trick.cards[0].position
        var winningCard = trick.cards[0].card
        var trickPoints = 0

        for (position, card) in trick.cards {
            trickPoints += card.points

            if beats(card: card, currentWinner: winningCard, leadSuit: leadSuit) {
                winningCard = card
                winningPosition = position
            }
        }

        gameState.currentTrick.winnerPosition = winningPosition
        gameState.currentTrick.points = trickPoints

        // Update score
        if winningPosition.team == .teamA {
            gameState.roundScore.teamAPoints += trickPoints
            gameState.roundScore.teamATricks += 1
        } else {
            gameState.roundScore.teamBPoints += trickPoints
            gameState.roundScore.teamBTricks += 1
        }

        let completedTrick = gameState.currentTrick
        gameState.completedTricks.append(completedTrick)

        // Broadcast trick result
        multipeerService.sendToAll(.trickResult(
            winnerPosition: winningPosition,
            points: trickPoints,
            trick: completedTrick
        ))

        // Check if round is over (8 tricks played)
        if gameState.completedTricks.count == 8 {
            resolveRound()
        } else {
            // Next trick, winner leads
            gameState.phase = .trickComplete
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                guard let self = self else { return }
                self.gameState.currentTrick = Trick()
                self.gameState.currentTurn = winningPosition
                self.gameState.phase = .playing
            }
        }
    }

    /// Determines if `challenger` beats `currentWinner` given the lead suit.
    private func beats(card challenger: Card, currentWinner: Card, leadSuit: Suit) -> Bool {
        let trumpSuit = gameState.trumpSuit

        // Both trump
        if let trump = trumpSuit,
           challenger.suit == trump && currentWinner.suit == trump {
            return challenger.strength > currentWinner.strength
        }

        // Challenger is trump, winner is not
        if let trump = trumpSuit, challenger.suit == trump && currentWinner.suit != trump {
            return true
        }

        // Winner is trump, challenger is not
        if let trump = trumpSuit, currentWinner.suit == trump && challenger.suit != trump {
            return false
        }

        // Neither is trump
        // Must be same suit as lead to win
        if challenger.suit == leadSuit && currentWinner.suit == leadSuit {
            return challenger.strength > currentWinner.strength
        }

        // Challenger follows suit, winner doesn't
        if challenger.suit == leadSuit && currentWinner.suit != leadSuit {
            return true
        }

        // Challenger doesn't follow suit
        return false
    }

    private func handleTrickResult(winner: PlayerPosition, points: Int, trick: Trick) {
        gameState.currentTrick = trick
        gameState.currentTrick.winnerPosition = winner
        gameState.currentTrick.points = points

        if winner.team == .teamA {
            gameState.roundScore.teamAPoints += points
            gameState.roundScore.teamATricks += 1
        } else {
            gameState.roundScore.teamBPoints += points
            gameState.roundScore.teamBTricks += 1
        }

        gameState.completedTricks.append(trick)

        if gameState.completedTricks.count == 8 {
            // Round over - wait for host to send result
        } else {
            gameState.phase = .trickComplete
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
                guard let self = self else { return }
                self.gameState.currentTrick = Trick()
                self.gameState.currentTurn = winner
                self.gameState.phase = .playing
            }
        }
    }

    // MARK: - Trump Reveal

    func requestTrumpReveal() {
        if isHost {
            handleTrumpRevealRequest(from: myPosition)
        } else {
            multipeerService.sendToAll(.requestTrumpReveal(requestingPosition: myPosition))
        }
    }

    private func handleTrumpRevealRequest(from position: PlayerPosition) {
        guard !gameState.trumpRevealed else { return }
        guard let player = gameState.player(at: position) else { return }
        guard let leadSuit = gameState.currentTrick.leadSuit else { return }

        // Trump can be revealed if the player cannot follow suit
        if !player.hasCardOfSuit(leadSuit) {
            gameState.trumpRevealed = true
            if let trump = gameState.trumpSuit {
                multipeerService.sendToAll(.revealTrump(suit: trump))
            }
        } else {
            sendInvalidMove("You can follow suit, so trump cannot be revealed", to: position)
        }
    }

    private func handleTrumpRevealed(suit: Suit) {
        gameState.trumpSuit = suit
        gameState.trumpRevealed = true
    }

    // MARK: - Round Resolution

    private func resolveRound() {
        guard isHost else { return }

        guard let bidAmount = gameState.highestBid?.amount,
              let biddingTeam = gameState.biddingTeam else { return }

        let biddingTeamPoints = biddingTeam == .teamA
            ? gameState.roundScore.teamAPoints
            : gameState.roundScore.teamBPoints

        let bidMet = biddingTeamPoints >= bidAmount

        if bidMet {
            // Bidding team scores a point
            if biddingTeam == .teamA {
                gameState.teamAGameScore += 1
            } else {
                gameState.teamBGameScore += 1
            }
        } else {
            // Defending team scores a point
            if biddingTeam == .teamA {
                gameState.teamBGameScore += 1
            } else {
                gameState.teamAGameScore += 1
            }
        }

        gameState.phase = .roundComplete

        multipeerService.sendToAll(.roundResult(
            teamAPoints: gameState.roundScore.teamAPoints,
            teamBPoints: gameState.roundScore.teamBPoints,
            bidMet: bidMet
        ))

        // Check for game over
        if gameState.teamAGameScore >= gameState.targetScore {
            gameState.phase = .gameOver
            multipeerService.sendToAll(.gameOver(
                winningTeam: .teamA,
                teamAScore: gameState.teamAGameScore,
                teamBScore: gameState.teamBGameScore
            ))
        } else if gameState.teamBGameScore >= gameState.targetScore {
            gameState.phase = .gameOver
            multipeerService.sendToAll(.gameOver(
                winningTeam: .teamB,
                teamAScore: gameState.teamAGameScore,
                teamBScore: gameState.teamBGameScore
            ))
        }
    }

    private func handleRoundResult(teamA: Int, teamB: Int, bidMet: Bool) {
        gameState.roundScore.teamAPoints = teamA
        gameState.roundScore.teamBPoints = teamB

        guard let biddingTeam = gameState.biddingTeam else { return }

        if bidMet {
            if biddingTeam == .teamA {
                gameState.teamAGameScore += 1
            } else {
                gameState.teamBGameScore += 1
            }
        } else {
            if biddingTeam == .teamA {
                gameState.teamBGameScore += 1
            } else {
                gameState.teamAGameScore += 1
            }
        }

        gameState.phase = .roundComplete
    }

    private func handleGameOver(winner: Team, teamAScore: Int, teamBScore: Int) {
        gameState.teamAGameScore = teamAScore
        gameState.teamBGameScore = teamBScore
        gameState.phase = .gameOver
    }

    // MARK: - New Round

    func startNewRound() {
        guard isHost else { return }

        let nextDealer = gameState.currentDealer.next
        gameState.currentDealer = nextDealer
        gameState.completedTricks = []
        gameState.currentTrick = Trick()
        gameState.roundScore = RoundScore()
        gameState.trumpSuit = nil
        gameState.trumpRevealed = false
        gameState.trumpCallerPosition = nil
        gameState.bids = []
        gameState.passedPlayers = []
        gameState.highestBid = nil
        gameState.minimumBid = 14
        gameState.hasDealtSecondRound = false
        gameState.secondDealHands = nil
        gameState.roundNumber += 1

        multipeerService.sendToAll(.newRound(dealerPosition: nextDealer))
        dealFirstRound()
    }

    private func handleNewRound(dealer: PlayerPosition) {
        gameState.currentDealer = dealer
        gameState.completedTricks = []
        gameState.currentTrick = Trick()
        gameState.roundScore = RoundScore()
        gameState.trumpSuit = nil
        gameState.trumpRevealed = false
        gameState.trumpCallerPosition = nil
        gameState.bids = []
        gameState.passedPlayers = []
        gameState.highestBid = nil
        gameState.minimumBid = 14
        gameState.hasDealtSecondRound = false
        gameState.secondDealHands = nil
        gameState.roundNumber += 1
    }

    // MARK: - Helpers

    private func sendInvalidMove(_ reason: String, to position: PlayerPosition) {
        if position == myPosition {
            showErrorMessage(reason)
        } else {
            multipeerService.sendToAll(.invalidMove(reason: reason, position: position))
        }
    }

    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showError = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            self?.showError = false
        }
    }

    // MARK: - Computed Properties

    var myHand: [Card] {
        gameState.player(at: myPosition)?.sortedHand ?? []
    }

    var isMyTurn: Bool {
        gameState.currentTurn == myPosition && gameState.phase == .playing
    }

    var isMyBiddingTurn: Bool {
        gameState.currentBidder == myPosition && gameState.phase == .bidding
    }

    var shouldSelectTrump: Bool {
        gameState.phase == .selectingTrump && gameState.trumpCallerPosition == myPosition
    }

    var trumpDisplayText: String {
        if let trump = gameState.trumpSuit {
            if gameState.trumpRevealed {
                return "Trump: \(trump.symbol) \(trump.rawValue)"
            } else if myPosition == gameState.trumpCallerPosition {
                return "Trump (hidden): \(trump.symbol) \(trump.rawValue)"
            } else {
                return "Trump: Hidden"
            }
        }
        return "Trump: Not set"
    }
}
