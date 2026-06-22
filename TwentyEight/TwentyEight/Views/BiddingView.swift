import SwiftUI

struct BiddingView: View {

    @ObservedObject var gameEngine: GameEngine
    @State private var selectedBid: Int = 14

    var body: some View {
        VStack(spacing: 16) {
            // Header
            Text("Bidding Phase")
                .font(.title3.bold())
                .foregroundColor(.yellow)

            // Current bidder info
            HStack {
                Circle()
                    .fill(Color.green)
                    .frame(width: 10, height: 10)
                    .opacity(gameEngine.isMyBiddingTurn ? 1 : 0.3)

                Text(currentBidderText)
                    .foregroundColor(.white)
            }

            // Highest bid
            if let highBid = gameEngine.gameState.highestBid {
                HStack {
                    Text("Highest Bid:")
                        .foregroundColor(.white.opacity(0.6))
                    Text("\(highBid.amount)")
                        .font(.title2.bold())
                        .foregroundColor(.yellow)
                    Text("by \(highBid.playerPosition.name)")
                        .foregroundColor(.white.opacity(0.6))
                }
            }

            // Bid history
            bidHistory

            if gameEngine.isMyBiddingTurn {
                myBiddingControls
            } else {
                Text("Waiting for \(gameEngine.gameState.currentBidder.name)...")
                    .foregroundColor(.white.opacity(0.5))
                    .italic()
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.6))
        )
        .padding(.horizontal)
    }

    private var currentBidderText: String {
        if gameEngine.isMyBiddingTurn {
            return "Your turn to bid!"
        }
        return "\(gameEngine.gameState.currentBidder.name) is bidding..."
    }

    private var bidHistory: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(gameEngine.gameState.bids, id: \.amount) { bid in
                    VStack(spacing: 2) {
                        Text(bid.playerPosition.name)
                            .font(.caption2)
                            .foregroundColor(.white.opacity(0.5))
                        Text("\(bid.amount)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.yellow)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.yellow.opacity(0.15))
                    .cornerRadius(8)
                }

                ForEach(Array(gameEngine.gameState.passedPlayers), id: \.self) { posRaw in
                    if let pos = PlayerPosition(rawValue: posRaw) {
                        VStack(spacing: 2) {
                            Text(pos.name)
                                .font(.caption2)
                                .foregroundColor(.white.opacity(0.5))
                            Text("Pass")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.red.opacity(0.7))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
        }
    }

    private var myBiddingControls: some View {
        VStack(spacing: 12) {
            // Bid slider
            HStack {
                Text("\(gameEngine.gameState.minimumBid)")
                    .foregroundColor(.white.opacity(0.5))
                    .font(.caption)

                Slider(
                    value: Binding(
                        get: { Double(selectedBid) },
                        set: { selectedBid = Int($0) }
                    ),
                    in: Double(gameEngine.gameState.minimumBid)...28,
                    step: 1
                )
                .accentColor(.yellow)

                Text("28")
                    .foregroundColor(.white.opacity(0.5))
                    .font(.caption)
            }

            Text("Bid: \(selectedBid)")
                .font(.title2.bold())
                .foregroundColor(.yellow)

            HStack(spacing: 16) {
                // Pass button
                Button(action: {
                    gameEngine.passBid()
                }) {
                    Text("Pass")
                        .font(.headline)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.red.opacity(0.15))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.3), lineWidth: 1)
                        )
                }

                // Bid button
                Button(action: {
                    gameEngine.placeBid(amount: selectedBid)
                }) {
                    Text("Bid \(selectedBid)")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.yellow)
                        .cornerRadius(12)
                }
            }
        }
        .onAppear {
            selectedBid = gameEngine.gameState.minimumBid
        }
        .onChange(of: gameEngine.gameState.minimumBid) { newMin in
            if selectedBid < newMin {
                selectedBid = newMin
            }
        }
    }
}
