import Foundation
import MultipeerConnectivity
import Combine

// MARK: - Multipeer Service

/// Handles all peer-to-peer communication using MultipeerConnectivity.
/// The host advertises the game, others browse and join.
class MultipeerService: NSObject, ObservableObject {

    static let serviceType = "twentyeight-game"

    // Published state
    @Published var connectedPeers: [MCPeerID] = []
    @Published var isHosting: Bool = false
    @Published var isBrowsing: Bool = false
    @Published var availableHosts: [MCPeerID] = []
    @Published var connectionState: ConnectionState = .disconnected

    enum ConnectionState {
        case disconnected
        case connecting
        case connected
    }

    // Peer info
    let myPeerID: MCPeerID
    private var session: MCSession!
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?

    // Message handling
    var onMessageReceived: ((GameMessage, MCPeerID) -> Void)?
    var onPeerConnected: ((MCPeerID) -> Void)?
    var onPeerDisconnected: ((MCPeerID) -> Void)?

    // Peer-to-position mapping
    var peerPositionMap: [String: PlayerPosition] = [:]

    init(playerName: String) {
        myPeerID = MCPeerID(displayName: playerName)
        super.init()
        session = MCSession(peer: myPeerID, securityIdentity: nil, encryptionPreference: .required)
        session.delegate = self
    }

    deinit {
        stopAll()
    }

    // MARK: - Host

    func startHosting() {
        advertiser = MCNearbyServiceAdvertiser(
            peer: myPeerID,
            discoveryInfo: nil,
            serviceType: MultipeerService.serviceType
        )
        advertiser?.delegate = self
        advertiser?.startAdvertisingPeer()
        isHosting = true
        connectionState = .connected
    }

    func stopHosting() {
        advertiser?.stopAdvertisingPeer()
        advertiser = nil
        isHosting = false
    }

    // MARK: - Browse / Join

    func startBrowsing() {
        browser = MCNearbyServiceBrowser(
            peer: myPeerID,
            serviceType: MultipeerService.serviceType
        )
        browser?.delegate = self
        browser?.startBrowsingForPeers()
        isBrowsing = true
    }

    func stopBrowsing() {
        browser?.stopBrowsingForPeers()
        browser = nil
        isBrowsing = false
    }

    func joinHost(_ hostPeerID: MCPeerID) {
        guard let browser = browser else { return }
        connectionState = .connecting
        browser.invitePeer(hostPeerID, to: session, withContext: nil, timeout: 30)
    }

    // MARK: - Messaging

    func send(_ message: GameMessage, to peers: [MCPeerID]? = nil) {
        guard let data = message.encoded() else { return }
        let targets = peers ?? session.connectedPeers
        guard !targets.isEmpty else { return }

        do {
            try session.send(data, toPeers: targets, with: .reliable)
        } catch {
            print("Failed to send message: \(error.localizedDescription)")
        }
    }

    func sendToAll(_ message: GameMessage) {
        send(message, to: session.connectedPeers)
    }

    func sendToPeer(at position: PlayerPosition, message: GameMessage) {
        guard let peerName = peerPositionMap.first(where: { $0.value == position })?.key,
              let peer = session.connectedPeers.first(where: { $0.displayName == peerName }) else {
            return
        }
        send(message, to: [peer])
    }

    // MARK: - Cleanup

    func stopAll() {
        stopHosting()
        stopBrowsing()
        session.disconnect()
        connectedPeers = []
        connectionState = .disconnected
    }

    func peerID(for position: PlayerPosition) -> MCPeerID? {
        guard let peerName = peerPositionMap.first(where: { $0.value == position })?.key else {
            return nil
        }
        return session.connectedPeers.first { $0.displayName == peerName }
    }
}

// MARK: - MCSessionDelegate

extension MultipeerService: MCSessionDelegate {

    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            switch state {
            case .connected:
                if !self.connectedPeers.contains(peerID) {
                    self.connectedPeers.append(peerID)
                }
                self.connectionState = .connected
                self.onPeerConnected?(peerID)
            case .notConnected:
                self.connectedPeers.removeAll { $0 == peerID }
                self.onPeerDisconnected?(peerID)
                if self.connectedPeers.isEmpty && !self.isHosting {
                    self.connectionState = .disconnected
                }
            case .connecting:
                self.connectionState = .connecting
            @unknown default:
                break
            }
        }
    }

    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        guard let message = GameMessage.decoded(from: data) else { return }
        DispatchQueue.main.async { [weak self] in
            self?.onMessageReceived?(message, peerID)
        }
    }

    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {}
    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {}
    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {}
}

// MARK: - MCNearbyServiceAdvertiserDelegate

extension MultipeerService: MCNearbyServiceAdvertiserDelegate {

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        // Auto-accept if we have room (need 3 more players)
        if connectedPeers.count < 3 {
            invitationHandler(true, session)
        } else {
            invitationHandler(false, nil)
        }
    }

    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didNotStartAdvertisingPeer error: Error) {
        print("Failed to start advertising: \(error.localizedDescription)")
    }
}

// MARK: - MCNearbyServiceBrowserDelegate

extension MultipeerService: MCNearbyServiceBrowserDelegate {

    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String: String]?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if !self.availableHosts.contains(peerID) {
                self.availableHosts.append(peerID)
            }
        }
    }

    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        DispatchQueue.main.async { [weak self] in
            self?.availableHosts.removeAll { $0 == peerID }
        }
    }

    func browser(_ browser: MCNearbyServiceBrowser, didNotStartBrowsingForPeers error: Error) {
        print("Failed to start browsing: \(error.localizedDescription)")
    }
}
