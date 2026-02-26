import { Env } from "../worker";
import { CONFIG } from "@shared/constants";

type TableState = "IDLE" | "SPINNING" | "RESULT";

interface GameState {
  state: TableState;
  nextTransition: number;
  lastBall: number | null;
}

export class RouletteTable implements DurableObject {
  private gameState: GameState = {
    state: "IDLE",
    nextTransition: Date.now() + CONFIG.ROULETTE_IDLE_MS,
    lastBall: null,
  };

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<GameState>("gameState");
      if (stored) {
        this.gameState = stored;
        // Resume alarm if needed
        if (this.gameState.nextTransition > Date.now()) {
          await this.state.storage.setAlarm(this.gameState.nextTransition);
        } else {
          await this.transition();
        }
      } else {
        await this.state.storage.setAlarm(this.gameState.nextTransition);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 400 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);

    // Initial sync
    server.send(
      JSON.stringify({
        type: "SYNC",
        payload: { ...this.gameState, serverTime: Date.now() },
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Current table is broadcast-only.
  }

  async alarm() {
    await this.transition();
  }

  private async transition() {
    const now = Date.now();

    switch (this.gameState.state) {
      case "IDLE":
        this.gameState.state = "SPINNING";
        this.gameState.nextTransition = now + CONFIG.ROULETTE_SPIN_MS;
        this.gameState.lastBall = null;
        break;
      case "SPINNING":
        this.gameState.state = "RESULT";
        this.gameState.nextTransition = now + CONFIG.ROULETTE_RESULT_MS;
        this.gameState.lastBall = Math.floor(
          Math.random() * CONFIG.ROULETTE_NUMBERS,
        );
        break;
      case "RESULT":
        this.gameState.state = "IDLE";
        this.gameState.nextTransition = now + CONFIG.ROULETTE_IDLE_MS;
        break;
    }

    await this.state.storage.put("gameState", this.gameState);
    await this.state.storage.setAlarm(this.gameState.nextTransition);

    this.broadcast({
      type: "STATE_CHANGE",
      payload: { ...this.gameState, serverTime: Date.now() },
    });
  }

  private broadcast(msg: { type: string; payload: unknown }) {
    const message = JSON.stringify(msg);
    this.state.getWebSockets().forEach((ws) => {
      try {
        ws.send(message);
      } catch (e) {
        // ws likely closing
      }
    });
  }
}
