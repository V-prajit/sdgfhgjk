import SwiftUI

struct ScoreboardView: View {

    @ObservedObject var gameEngine: GameEngine
    @State private var showDetail: Bool = false

    var body: some View {
        VStack(spacing: 4) {
            // Compact score bar
            HStack(spacing: 16) {
                // Team A
                teamScoreBadge(
                    team: .teamA,
                    roundPoints: gameEngine.gameState.roundScore.teamAPoints,
                    gameScore: gameEngine.gameState.teamAGameScore,
                    tricks: gameEngine.gameState.roundScore.teamATricks,
                    isBiddingTeam: gameEngine.gameState.biddingTeam == .teamA
                )

                // Center info
                VStack(spacing: 2) {
                    if let bid = gameEngine.gameState.highestBid {
                        Text("Bid: \(bid.amount)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.yellow)
                    }

                    Text("Round \(gameEngine.gameState.roundNumber)")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.5))

                    Text(gameEngine.trumpDisplayText)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.cyan)
                }

                // Team B
                teamScoreBadge(
                    team: .teamB,
                    roundPoints: gameEngine.gameState.roundScore.teamBPoints,
                    gameScore: gameEngine.gameState.teamBGameScore,
                    tricks: gameEngine.gameState.roundScore.teamBTricks,
                    isBiddingTeam: gameEngine.gameState.biddingTeam == .teamB
                )
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.black.opacity(0.5))
            )
            .onTapGesture { showDetail.toggle() }

            if showDetail {
                detailedScore
                    .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: showDetail)
    }

    private func teamScoreBadge(
        team: Team,
        roundPoints: Int,
        gameScore: Int,
        tricks: Int,
        isBiddingTeam: Bool
    ) -> some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Text(team.name)
                    .font(.system(size: 11, weight: .bold))
                if isBiddingTeam {
                    Image(systemName: "star.fill")
                        .font(.system(size: 8))
                        .foregroundColor(.yellow)
                }
            }
            .foregroundColor(team == .teamA ? .cyan : .orange)

            HStack(spacing: 8) {
                VStack(spacing: 0) {
                    Text("\(roundPoints)")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Text("pts")
                        .font(.system(size: 8))
                        .foregroundColor(.white.opacity(0.4))
                }

                VStack(spacing: 0) {
                    Text("\(gameScore)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                    Text("wins")
                        .font(.system(size: 8))
                        .foregroundColor(.white.opacity(0.4))
                }
            }

            Text("\(tricks) tricks")
                .font(.system(size: 9))
                .foregroundColor(.white.opacity(0.4))
        }
        .frame(maxWidth: .infinity)
    }

    private var detailedScore: some View {
        VStack(spacing: 8) {
            // Trick history
            Text("Completed Tricks")
                .font(.caption.bold())
                .foregroundColor(.white.opacity(0.6))

            if gameEngine.gameState.completedTricks.isEmpty {
                Text("No tricks yet")
                    .font(.caption2)
                    .foregroundColor(.white.opacity(0.3))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Array(gameEngine.gameState.completedTricks.enumerated()), id: \.offset) { index, trick in
                            VStack(spacing: 2) {
                                Text("#\(index + 1)")
                                    .font(.system(size: 9))
                                    .foregroundColor(.white.opacity(0.4))

                                if let winner = trick.winnerPosition {
                                    Text(winner.name)
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundColor(winner.team == .teamA ? .cyan : .orange)
                                }

                                Text("+\(trick.points)")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.yellow)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.08))
                            .cornerRadius(6)
                        }
                    }
                }
            }

            // Player positions
            HStack(spacing: 12) {
                ForEach(gameEngine.gameState.players, id: \.id) { player in
                    VStack(spacing: 2) {
                        Text(player.position.name)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                        Text(player.name)
                            .font(.system(size: 9))
                            .foregroundColor(.white.opacity(0.5))
                        Text(player.team.name)
                            .font(.system(size: 8))
                            .foregroundColor(player.team == .teamA ? .cyan : .orange)
                        Text("\(player.hand.count) cards")
                            .font(.system(size: 8))
                            .foregroundColor(.white.opacity(0.3))
                    }
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.black.opacity(0.5))
        )
    }
}
