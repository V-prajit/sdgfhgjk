import SwiftUI
import MultipeerConnectivity

struct LobbyView: View {

    @ObservedObject var gameEngine: GameEngine
    @ObservedObject var multipeerService: MultipeerService
    @Binding var playerName: String
    @Binding var showingGame: Bool

    @State private var isHosting = false
    @State private var isJoining = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.15, blue: 0.1),
                         Color(red: 0.02, green: 0.08, blue: 0.05)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                // Title
                VStack(spacing: 8) {
                    Text("28")
                        .font(.system(size: 80, weight: .bold, design: .serif))
                        .foregroundColor(.yellow)

                    Text("Card Game")
                        .font(.title2)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding(.top, 40)

                // Card decoration
                HStack(spacing: -20) {
                    ForEach(["♠", "♥", "♣", "♦"], id: \.self) { symbol in
                        Text(symbol)
                            .font(.system(size: 40))
                            .foregroundColor(symbol == "♥" || symbol == "♦" ? .red : .white)
                    }
                }

                Spacer()

                if !isHosting && !isJoining {
                    mainMenu
                } else if isHosting {
                    hostingView
                } else {
                    joiningView
                }

                Spacer()
            }
            .padding()
        }
        .navigationBarHidden(true)
    }

    // MARK: - Main Menu

    private var mainMenu: some View {
        VStack(spacing: 20) {
            // Name input
            VStack(alignment: .leading, spacing: 8) {
                Text("Your Name")
                    .foregroundColor(.white.opacity(0.7))
                    .font(.caption)

                TextField("Enter your name", text: $playerName)
                    .textFieldStyle(.plain)
                    .padding()
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                    .foregroundColor(.white)
            }
            .padding(.horizontal)

            // Host button
            Button(action: {
                guard !playerName.isEmpty else { return }
                isHosting = true
                gameEngine.createGame(playerName: playerName)
            }) {
                HStack {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                    Text("Host Game")
                }
                .font(.headline)
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.yellow)
                .cornerRadius(14)
            }
            .disabled(playerName.isEmpty)

            // Join button
            Button(action: {
                guard !playerName.isEmpty else { return }
                isJoining = true
                multipeerService.startBrowsing()
            }) {
                HStack {
                    Image(systemName: "magnifyingglass")
                    Text("Join Game")
                }
                .font(.headline)
                .foregroundColor(.yellow)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.yellow.opacity(0.15))
                .cornerRadius(14)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.yellow.opacity(0.5), lineWidth: 1)
                )
            }
            .disabled(playerName.isEmpty)
        }
    }

    // MARK: - Hosting View

    private var hostingView: some View {
        VStack(spacing: 20) {
            Text("Hosting Game")
                .font(.title2)
                .foregroundColor(.yellow)

            Text("Waiting for players...")
                .foregroundColor(.white.opacity(0.7))

            // Player list
            VStack(spacing: 12) {
                ForEach(PlayerPosition.allCases, id: \.rawValue) { position in
                    playerSlot(position: position)
                }
            }
            .padding()
            .background(Color.white.opacity(0.08))
            .cornerRadius(16)

            // Connected count
            Text("\(gameEngine.gameState.players.count)/4 Players")
                .foregroundColor(.white.opacity(0.7))

            // Start button
            Button(action: {
                gameEngine.startGameAsHost()
                showingGame = true
            }) {
                Text("Start Game")
                    .font(.headline)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(gameEngine.gameState.players.count == 4 ? Color.green : Color.gray)
                    .cornerRadius(14)
            }
            .disabled(gameEngine.gameState.players.count < 4)

            Button("Cancel") {
                multipeerService.stopAll()
                isHosting = false
            }
            .foregroundColor(.red.opacity(0.8))
        }
    }

    // MARK: - Joining View

    private var joiningView: some View {
        VStack(spacing: 20) {
            Text("Finding Games...")
                .font(.title2)
                .foregroundColor(.yellow)

            if multipeerService.availableHosts.isEmpty {
                VStack(spacing: 12) {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    Text("Searching nearby...")
                        .foregroundColor(.white.opacity(0.5))
                }
                .padding(40)
            } else {
                VStack(spacing: 12) {
                    ForEach(multipeerService.availableHosts, id: \.displayName) { host in
                        Button(action: {
                            gameEngine.connectToHost(host)
                            showingGame = true
                        }) {
                            HStack {
                                Image(systemName: "person.crop.circle")
                                Text(host.displayName)
                                Spacer()
                                Image(systemName: "arrow.right.circle.fill")
                            }
                            .foregroundColor(.white)
                            .padding()
                            .background(Color.white.opacity(0.12))
                            .cornerRadius(12)
                        }
                    }
                }
            }

            Button("Cancel") {
                multipeerService.stopBrowsing()
                isJoining = false
            }
            .foregroundColor(.red.opacity(0.8))
        }
    }

    // MARK: - Player Slot

    private func playerSlot(position: PlayerPosition) -> some View {
        let player = gameEngine.gameState.players.first { $0.position == position }
        return HStack {
            Circle()
                .fill(player != nil ? Color.green : Color.gray.opacity(0.3))
                .frame(width: 12, height: 12)

            Text(position.name)
                .foregroundColor(.white.opacity(0.5))
                .frame(width: 60, alignment: .leading)

            Text(player?.name ?? "Empty")
                .foregroundColor(player != nil ? .white : .white.opacity(0.3))

            Spacer()

            Text(position.team.name)
                .font(.caption)
                .foregroundColor(position.team == .teamA ? .cyan : .orange)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    (position.team == .teamA ? Color.cyan : Color.orange).opacity(0.15)
                )
                .cornerRadius(8)
        }
        .padding(.vertical, 4)
    }
}
