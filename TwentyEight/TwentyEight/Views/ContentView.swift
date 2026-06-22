import SwiftUI

struct ContentView: View {

    @StateObject private var multipeerService: MultipeerService
    @StateObject private var gameEngine: GameEngine

    @State private var playerName: String = ""
    @State private var showingGame = false

    init() {
        let service = MultipeerService(playerName: UIDevice.current.name)
        let engine = GameEngine(multipeerService: service)
        _multipeerService = StateObject(wrappedValue: service)
        _gameEngine = StateObject(wrappedValue: engine)
    }

    var body: some View {
        NavigationStack {
            if showingGame {
                GameBoardView(gameEngine: gameEngine)
            } else {
                LobbyView(
                    gameEngine: gameEngine,
                    multipeerService: multipeerService,
                    playerName: $playerName,
                    showingGame: $showingGame
                )
            }
        }
    }
}

#Preview {
    ContentView()
}
