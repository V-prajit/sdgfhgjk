import SwiftUI

struct GameBoardView: View {

    @ObservedObject var gameEngine: GameEngine
    @State private var selectedCard: Card?

    var body: some View {
        ZStack {
            // Table background
            tableBackground

            VStack(spacing: 0) {
                // Top: Scoreboard
                ScoreboardView(gameEngine: gameEngine)
                    .padding(.top, 8)

                Spacer()

                // Middle section depends on game phase
                middleContent

                Spacer()

                // Bottom: Player's hand
                HandView(gameEngine: gameEngine, selectedCard: $selectedCard)
                    .padding(.bottom, 8)
            }

            // Error overlay
            if gameEngine.showError, let error = gameEngine.errorMessage {
                errorBanner(message: error)
            }

            // Round complete overlay
            if gameEngine.gameState.phase == .roundComplete {
                roundCompleteOverlay
            }

            // Game over overlay
            if gameEngine.gameState.phase == .gameOver {
                gameOverOverlay
            }
        }
        .navigationBarHidden(true)
        .statusBarHidden(false)
    }

    // MARK: - Background

    private var tableBackground: some View {
        ZStack {
            Color(red: 0.04, green: 0.22, blue: 0.12)
                .ignoresSafeArea()

            // Felt texture
            RadialGradient(
                colors: [
                    Color(red: 0.06, green: 0.28, blue: 0.15),
                    Color(red: 0.03, green: 0.16, blue: 0.08)
                ],
                center: .center,
                startRadius: 50,
                endRadius: 400
            )
            .ignoresSafeArea()
        }
    }

    // MARK: - Middle Content

    @ViewBuilder
    private var middleContent: some View {
        switch gameEngine.gameState.phase {
        case .waitingForPlayers:
            waitingView

        case .dealing:
            dealingView

        case .bidding:
            BiddingView(gameEngine: gameEngine)

        case .selectingTrump:
            TrumpSelectionView(gameEngine: gameEngine)

        case .playing, .trickComplete:
            trickArea

        case .roundComplete, .gameOver:
            EmptyView()
        }
    }

    // MARK: - Waiting View

    private var waitingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
            Text("Waiting for players to join...")
                .foregroundColor(.white.opacity(0.6))

            VStack(spacing: 4) {
                ForEach(gameEngine.gameState.players, id: \.id) { player in
                    HStack {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                        Text(player.name)
                            .foregroundColor(.white)
                        Text("(\(player.position.name))")
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
            }
        }
        .padding()
        .background(Color.black.opacity(0.4))
        .cornerRadius(16)
    }

    // MARK: - Dealing View

    private var dealingView: some View {
        VStack(spacing: 16) {
            Image(systemName: "rectangle.portrait.on.rectangle.portrait.angled.fill")
                .font(.system(size: 48))
                .foregroundColor(.yellow)
                .rotationEffect(.degrees(15))

            Text("Dealing cards...")
                .font(.title3)
                .foregroundColor(.white)
        }
    }

    // MARK: - Trick Area

    private var trickArea: some View {
        VStack(spacing: 8) {
            // Turn indicator
            turnIndicator

            // Table with played cards in cross pattern
            ZStack {
                // Table border
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white.opacity(0.04))
                    .frame(width: 280, height: 240)

                // Cards played - arranged by position relative to local player
                let positions = relativePositions()

                // Top (across from player)
                cardSlot(for: positions.top, yOffset: -70)

                // Left
                cardSlot(for: positions.left, xOffset: -90)

                // Right
                cardSlot(for: positions.right, xOffset: 90)

                // Bottom (local player's played card)
                cardSlot(for: positions.bottom, yOffset: 70)

                // Lead suit indicator
                if let leadSuit = gameEngine.gameState.currentTrick.leadSuit {
                    VStack {
                        Text("Lead: \(leadSuit.symbol)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }
            }

            // Other players' card counts
            opponentInfo
        }
    }

    private var turnIndicator: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(gameEngine.isMyTurn ? Color.green : Color.yellow)
                .frame(width: 8, height: 8)

            if gameEngine.isMyTurn {
                Text("Your turn - select a card")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.green)
            } else {
                Text("\(gameEngine.gameState.currentTurn.name)'s turn")
                    .font(.system(size: 13))
                    .foregroundColor(.white.opacity(0.6))
            }

            Spacer()

            Text("Trick \(gameEngine.gameState.completedTricks.count + 1)/8")
                .font(.system(size: 11))
                .foregroundColor(.white.opacity(0.4))
        }
        .padding(.horizontal, 20)
    }

    private func cardSlot(for position: PlayerPosition, xOffset: CGFloat = 0, yOffset: CGFloat = 0) -> some View {
        let playedCard = gameEngine.gameState.currentTrick.cards.first { $0.position == position }

        return VStack(spacing: 2) {
            if let played = playedCard {
                MiniCardView(card: played.card)
                    .transition(.scale.combined(with: .opacity))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color.white.opacity(0.15), style: StrokeStyle(lineWidth: 1, dash: [4]))
                    .frame(width: 44, height: 60)
            }

            Text(position.name)
                .font(.system(size: 9))
                .foregroundColor(.white.opacity(0.4))
        }
        .offset(x: xOffset, y: yOffset)
        .animation(.easeInOut(duration: 0.3), value: playedCard?.card.id)
    }

    /// Maps absolute positions to relative positions (top/left/right/bottom)
    /// based on the local player's position.
    private func relativePositions() -> (top: PlayerPosition, left: PlayerPosition, right: PlayerPosition, bottom: PlayerPosition) {
        let me = gameEngine.myPosition
        let left = PlayerPosition(rawValue: (me.rawValue + 1) % 4)!
        let top = PlayerPosition(rawValue: (me.rawValue + 2) % 4)!
        let right = PlayerPosition(rawValue: (me.rawValue + 3) % 4)!
        return (top: top, left: left, right: right, bottom: me)
    }

    // MARK: - Opponent Info

    private var opponentInfo: some View {
        let positions = relativePositions()

        return HStack(spacing: 20) {
            opponentBadge(position: positions.left)
            opponentBadge(position: positions.top)
            opponentBadge(position: positions.right)
        }
        .padding(.horizontal)
    }

    private func opponentBadge(position: PlayerPosition) -> some View {
        let player = gameEngine.gameState.player(at: position)
        let isCurrentTurn = gameEngine.gameState.currentTurn == position && gameEngine.gameState.phase == .playing

        return VStack(spacing: 2) {
            HStack(spacing: 3) {
                if isCurrentTurn {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                }
                Text(player?.name ?? position.name)
                    .font(.system(size: 11, weight: isCurrentTurn ? .bold : .regular))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }

            HStack(spacing: 2) {
                ForEach(0..<(player?.hand.count ?? 0), id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 6, height: 10)
                }
            }

            Text(position.team.name)
                .font(.system(size: 8))
                .foregroundColor(position.team == .teamA ? .cyan : .orange)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isCurrentTurn ? Color.green.opacity(0.15) : Color.black.opacity(0.3))
        )
    }

    // MARK: - Error Banner

    private func errorBanner(message: String) -> some View {
        VStack {
            Text(message)
                .font(.subheadline.bold())
                .foregroundColor(.white)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.red.opacity(0.9))
                )
                .padding(.top, 60)

            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
        .animation(.easeInOut, value: gameEngine.showError)
    }

    // MARK: - Round Complete Overlay

    private var roundCompleteOverlay: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("Round Complete!")
                    .font(.title.bold())
                    .foregroundColor(.yellow)

                // Round score
                HStack(spacing: 40) {
                    VStack {
                        Text("Team A")
                            .foregroundColor(.cyan)
                        Text("\(gameEngine.gameState.roundScore.teamAPoints)")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.white)
                        Text("points")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }

                    VStack {
                        Text("Team B")
                            .foregroundColor(.orange)
                        Text("\(gameEngine.gameState.roundScore.teamBPoints)")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.white)
                        Text("points")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                }

                // Bid result
                if let bid = gameEngine.gameState.highestBid,
                   let biddingTeam = gameEngine.gameState.biddingTeam {
                    let biddingPoints = biddingTeam == .teamA
                        ? gameEngine.gameState.roundScore.teamAPoints
                        : gameEngine.gameState.roundScore.teamBPoints
                    let bidMet = biddingPoints >= bid.amount

                    VStack(spacing: 8) {
                        Text("\(biddingTeam.name) bid \(bid.amount)")
                            .foregroundColor(.white.opacity(0.7))

                        Text(bidMet ? "Bid Met!" : "Bid Failed!")
                            .font(.title2.bold())
                            .foregroundColor(bidMet ? .green : .red)
                    }
                }

                // Game score
                HStack(spacing: 20) {
                    Text("Team A: \(gameEngine.gameState.teamAGameScore) wins")
                        .foregroundColor(.cyan)
                    Text("Team B: \(gameEngine.gameState.teamBGameScore) wins")
                        .foregroundColor(.orange)
                }
                .font(.subheadline)

                if gameEngine.isHost {
                    Button(action: {
                        gameEngine.startNewRound()
                    }) {
                        Text("Next Round")
                            .font(.headline)
                            .foregroundColor(.black)
                            .padding(.horizontal, 40)
                            .padding(.vertical, 14)
                            .background(Color.yellow)
                            .cornerRadius(14)
                    }
                } else {
                    Text("Waiting for host to start next round...")
                        .foregroundColor(.white.opacity(0.5))
                        .italic()
                }
            }
            .padding(30)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(red: 0.1, green: 0.1, blue: 0.15))
            )
            .padding()
        }
    }

    // MARK: - Game Over Overlay

    private var gameOverOverlay: some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Text("Game Over!")
                    .font(.largeTitle.bold())
                    .foregroundColor(.yellow)

                let winnerTeam: Team = gameEngine.gameState.teamAGameScore >= gameEngine.gameState.targetScore ? .teamA : .teamB
                let myTeamWon = gameEngine.myPosition.team == winnerTeam

                Text(myTeamWon ? "You Win!" : "You Lose")
                    .font(.title)
                    .foregroundColor(myTeamWon ? .green : .red)

                Text("\(winnerTeam.name) wins!")
                    .font(.title2)
                    .foregroundColor(.white)

                HStack(spacing: 40) {
                    VStack {
                        Text("Team A")
                            .foregroundColor(.cyan)
                        Text("\(gameEngine.gameState.teamAGameScore)")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Text("—")
                        .font(.title)
                        .foregroundColor(.white.opacity(0.3))

                    VStack {
                        Text("Team B")
                            .foregroundColor(.orange)
                        Text("\(gameEngine.gameState.teamBGameScore)")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(40)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(red: 0.08, green: 0.08, blue: 0.12))
            )
            .padding()
        }
    }
}
