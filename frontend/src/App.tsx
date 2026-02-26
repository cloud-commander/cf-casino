import { useState, useEffect } from "react";
import { Volume2, VolumeX, RefreshCw, Key } from "lucide-react";
import { Stage } from "@/components/Stage";
import { LiveTableAudio } from "@/components/LiveTableAudio";
import {
  LiveNarration,
  type NarrationMessage,
} from "@/components/LiveNarration";
import { TechnicalLog, type AuditLogEntry } from "@/components/TechnicalLog";
import type { AppStatus } from "@/components/StatusBadge";
import { ApiService } from "@/services/apiService";
import { ArchitectureCompare } from "@/components/ArchitectureCompare";
import { EducationTab } from "@/components/EducationTab";
import { CostComparison } from "@/components/CostComparison";
import { GlobalEdgeMap } from "@/components/GlobalEdgeMap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { audioService } from "@/services/audioService";
import { JURISDICTIONS, type Jurisdiction } from "@/types/game";
import { Turnstile } from "@marsidev/react-turnstile";
import { useGameSocket } from "@/hooks/useGameSocket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function App() {
  // Auth & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isVerified, setIsVerified] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(
    undefined,
  );
  const [balance, setBalance] = useState(0); // integer cents
  const [balanceDelta, setBalanceDelta] = useState(0);
  const [status, setStatus] = useState<AppStatus>("idle");

  // Hook into real WebSocket Game Loop (only after auth)
  const { gameState, isConnected } = useGameSocket(isAuthenticated);

  // Navigation & UI State
  const [rightPanelTab, setRightPanelTab] = useState<
    "live" | "competitive" | "education"
  >("live");
  const [topPanelTab, setTopPanelTab] = useState<"cost" | "network">("cost");
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isRouletteSoundEnabled, setIsRouletteSoundEnabled] = useState(true);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(
    JURISDICTIONS[0],
  );

  // Telemetry & Logs
  const [activeBets, setActiveBets] = useState<
    { amount: number; betType: string }[]
  >([]);
  const [narrations, setNarrations] = useState<NarrationMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Drive the visual countdown ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize clock with Edge server time to prevent countdown jumps
  useEffect(() => {
    if (gameState?.serverTime) {
      setServerTimeOffset(gameState.serverTime - Date.now());
    }
  }, [gameState]);

  // Sync Audio with State
  useEffect(() => {
    audioService.setEnabled(isSoundEnabled);
  }, [isSoundEnabled]);
  useEffect(() => {
    audioService.setRouletteEnabled(isRouletteSoundEnabled);
  }, [isRouletteSoundEnabled]);

  const addNarration = (text: string, emoji: string, event: string) => {
    setNarrations((prev) =>
      [
        ...prev,
        { id: crypto.randomUUID(), text, emoji, event, timestamp: new Date() },
      ].slice(-50),
    );
  };

  const addAuditLog = (
    event: string,
    duration: number,
    requestId: string,
    logStatus: "success" | "error" | "pending" = "success",
  ) => {
    setAuditLogs((prev) =>
      [
        ...prev,
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          requestId,
          event,
          duration,
          status: logStatus,
        },
      ].slice(-50),
    );
  };

  // Handle Real Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError(null);
    try {
      const res = await ApiService.login(userId, pin, turnstileToken);
      if (res.success && res.data) {
        setIsAuthenticated(true);
        setBalance(res.data.balance);
        addNarration(
          "Login successful. JWT session established on the Edge.",
          "🔐",
          "auth_success",
        );
        addNarration(
          "Jurisdictional Sovereignty: All PII and betting state pinned to UK/EU Edge nodes.",
          "🇬🇧",
          "jurisdiction_pin",
        );
        addAuditLog(
          "[WAF] login_auth_success",
          Math.round(performance.now() - performance.timeOrigin),
          res.meta.requestId,
        );
      } else {
        const msg = res.error?.message || "Login failed";
        console.error("[Auth] Login rejected:", msg);
        setLoginError(msg);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Internal error during login";
      console.error("[Auth] Login exception:", err);
      setLoginError(msg);
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.clearToken();
    setIsAuthenticated(false);
  };

  // React to Game State Transitions from WebSocket
  useEffect(() => {
    if (isConnected) {
      addAuditLog(
        "[DO] websocket_connected",
        15, // Synthetic fast connect time
        crypto.randomUUID(),
      );
    }
  }, [isConnected]);

  useEffect(() => {
    if (!gameState) return;

    if (gameState.state === "SPINNING") {
      audioService.play("SPIN", true);
      addNarration(
        "Wheel is spinning... WebSockets Hibernation API engaged. £0 DO billing.",
        "🎡",
        "sync_spin",
      );
    } else if (gameState.state === "RESULT") {
      audioService.stop("SPIN");
      audioService.play("LAND");
      addNarration(
        `Winning number: ${gameState.lastBall}! Syncing results...`,
        "🎲",
        "sync_result",
      );
      // Results would trigger balance updates if we had payout logic in DO
    } else if (gameState.state === "IDLE") {
      setActiveBets([]); // Reset bets for new round
      addNarration(
        "New betting round started via WebSocket broadcast. Table open.",
        "🟢",
        "sync_open",
      );
    }
  }, [gameState]);

  // Two-Phase Bet Placement
  const handlePlaceBet = async (amount: number, betType: string) => {
    if (
      !jurisdiction.isAllowed ||
      !gameState ||
      gameState.state !== "IDLE" ||
      balance < amount
    ) {
      console.warn("[Bet Blocked]", {
        allowed: jurisdiction.isAllowed,
        state: gameState?.state,
        balance,
        amount,
      });
      return;
    }

    audioService.play("CHIP");
    setStatus("authorizing");
    addNarration(
      `Durable Object 2PC: Hydrating balance from D1 (Persistence). Locking £${(amount / 100).toFixed(2)} for ${betType}...`,
      "🔒",
      "auth_start",
    );

    const startTime = performance.now();
    try {
      const authRes = await ApiService.authorizeBet(
        userId,
        amount,
        "main-match",
      );
      if (!authRes.success || !authRes.data) {
        throw new Error(authRes.error?.message || "Auth failed");
      }

      addAuditLog(
        "[DO] authorize_hold",
        Math.round(performance.now() - startTime),
        authRes.meta.requestId,
      );
      setStatus("confirming");
      addNarration(
        `Durable Object 2PC: Executing ACID atomic state change on Edge...`,
        "⚡",
        "confirm_start",
      );

      // 2. Confirm
      const confirmStart = performance.now();
      const confirmRes = await ApiService.confirmBet(
        userId,
        authRes.data.holdId,
      );
      if (!confirmRes.success || !confirmRes.data) {
        throw new Error(confirmRes.error?.message || "Confirm failed");
      }

      addAuditLog(
        "[DO] confirm_execute",
        Math.round(performance.now() - confirmStart),
        confirmRes.meta.requestId,
      );

      // Local Update
      setBalanceDelta(-amount);
      setBalance(confirmRes.data.balance);
      setActiveBets((prev) => [...prev, { amount, betType }]);
      setStatus("idle");
      addNarration(
        `Bet successful! Non-blocking ACID commit synced to D1 via Queues.`,
        "✅",
        "confirm_success",
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(err);
      setStatus("error");
      addNarration(`Bet failed: ${errorMessage}`, "❌", "bet_error");
    }
  };

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-accent-orange rounded-2xl flex items-center justify-center font-black text-2xl mb-8">
          CF
        </div>
        <h1 className="text-2xl font-bold uppercase text-white mb-2">
          Verifying Connection
        </h1>
        <div className="p-1 rounded-xl bg-glass-medium border border-glass-light">
          <Turnstile
            siteKey={
              import.meta.env.VITE_TURNSTILE_SITE_KEY ||
              "0x4AAAAAACXq8TepTf8S8JIe"
            }
            onSuccess={(token) => {
              setTurnstileToken(token);
              setIsVerified(true);
            }}
            options={{ theme: "dark" }}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-4 overflow-y-auto">
        <form
          onSubmit={handleLogin}
          className="w-[350px] bg-glass-medium border border-glass-light p-8 rounded-2xl shadow-2xl backdrop-blur-xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-accent-orange rounded-lg flex items-center justify-center text-black font-bold">
              CF
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-6 uppercase tracking-widest">
            Edge Login
          </h2>
          <div className="space-y-4">
            <Input
              placeholder="User ID (e.g. user_123)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-bg-primary/50 border-glass-light text-white placeholder:text-gray-500 w-full h-12 px-4 shadow-inner"
              required
            />
            <Input
              type="password"
              placeholder="PIN (4-6 digits)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="bg-bg-primary/50 border-glass-light text-white placeholder:text-gray-500 w-full h-12 px-4 shadow-inner"
              required
            />
            <Button
              type="submit"
              className="w-full bg-accent-teal hover:bg-accent-teal/80 text-black font-bold"
              disabled={isLoginLoading}
            >
              {isLoginLoading ? (
                <RefreshCw className="animate-spin" />
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" /> Secure Auth
                </>
              )}
            </Button>
            {loginError && (
              <p className="text-red-500 text-xs font-bold text-center mt-2 uppercase tracking-wider">
                {loginError}
              </p>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-primary text-text-primary font-sans flex flex-col animate-in fade-in duration-700 overflow-hidden">
      <header className="h-16 border-b border-glass-light flex items-center px-6 justify-between bg-bg-secondary sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 bg-accent-orange rounded-md flex items-center justify-center font-bold text-black cursor-pointer"
            onClick={handleLogout}
          >
            CF
          </div>
          <span className="font-bold tracking-widest text-lg uppercase">
            Edge Casino <span className="text-accent-teal text-sm">POC</span>
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-glass-light rounded-full border border-glass-light">
            <span className="text-[10px] font-bold uppercase text-text-muted">
              Compliance Edge
            </span>
            <Select
              value={jurisdiction.code}
              onValueChange={(v) =>
                setJurisdiction(
                  JURISDICTIONS.find((j) => j.code === v) || JURISDICTIONS[0],
                )
              }
            >
              <SelectTrigger className="h-6 w-[90px] bg-transparent border-none text-[10px] font-bold uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j.code} value={j.code}>
                    {j.flag} {j.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Latency:{" "}
            <span
              className={isConnected ? "text-accent-green" : "text-accent-pink"}
            >
              {isConnected ? "Real-time" : "Disconnected"}
            </span>
          </div>
        </div>
      </header>
      <div className="border-b border-glass-light bg-bg-secondary py-2 px-4 shadow-md z-40 relative">
        <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
          <div className="flex-1 min-w-0">
            <LiveTableAudio
              isMuted={!isSoundEnabled}
              onToggleMute={() => setIsSoundEnabled(!isSoundEnabled)}
            />
          </div>
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className={`flex-shrink-0 p-2 rounded-full border border-glass-light ${isSoundEnabled ? "bg-accent-teal/20 text-accent-teal" : "text-text-muted"}`}
          >
            {isSoundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-6 max-w-[1600px] mx-auto w-full z-10">
        <div className="flex flex-col gap-6 h-full min-h-[600px]">
          <Stage
            balance={balance / 100} // Convert to display pounds
            balanceDelta={balanceDelta / 100}
            status={status}
            tablePhase={gameState?.state || "IDLE"}
            timeLeft={
              gameState
                ? Math.max(
                    0,
                    Math.floor(
                      (gameState.nextTransition - (now + serverTimeOffset)) /
                        1000,
                    ),
                  )
                : 0
            }
            recentOutcome={gameState?.lastBall || null}
            activeBets={activeBets.map((b) => ({
              ...b,
              amount: b.amount / 100,
            }))}
            onPlaceBet={(amt, type) => handlePlaceBet(amt * 100, type)} // Convert input pounds to cents
            onChaosTrigger={() =>
              addNarration(
                "WAF Rate Limiting Simulation engaged.",
                "🔥",
                "chaos",
              )
            }
            jurisdiction={jurisdiction}
            isRouletteSoundEnabled={isRouletteSoundEnabled}
            onToggleRouletteSound={() =>
              setIsRouletteSoundEnabled(!isRouletteSoundEnabled)
            }
          />
        </div>

        <div className="flex flex-col gap-6 h-[calc(100vh-8rem)] sticky top-24">
          <div className="flex bg-glass-medium rounded-lg p-1 border border-glass-light">
            {["cost", "network"].map((t) => (
              <button
                key={t}
                onClick={() => setTopPanelTab(t as "cost" | "network")}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${topPanelTab === t ? "bg-accent-orange text-black" : "text-text-muted hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-[200px]">
            {topPanelTab === "cost" ? (
              <CostComparison eventCount={narrations.length * 10} />
            ) : (
              <GlobalEdgeMap />
            )}
          </div>

          <div className="flex bg-glass-medium rounded-lg p-1 border border-glass-light">
            <button
              onClick={() => setRightPanelTab("live")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md ${rightPanelTab === "live" ? "bg-accent-green text-black" : "text-text-muted hover:text-white"}`}
            >
              Live Analysis
            </button>
            <button
              onClick={() => setRightPanelTab("competitive")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md ${rightPanelTab === "competitive" ? "bg-accent-teal text-black" : "text-text-muted hover:text-white"}`}
            >
              Competitive
            </button>
            <button
              onClick={() => setRightPanelTab("education")}
              className={`flex-1 py-2 text-xs font-bold uppercase rounded-md ${rightPanelTab === "education" ? "bg-accent-yellow text-black" : "text-text-muted hover:text-white"}`}
            >
              Education
            </button>
          </div>

          {rightPanelTab === "live" ? (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              <div className="flex-1 min-h-0">
                <LiveNarration messages={narrations} />
              </div>
              <div className="flex-1 min-h-0">
                <TechnicalLog
                  logs={auditLogs}
                  onClear={() => setAuditLogs([])}
                />
              </div>
            </div>
          ) : rightPanelTab === "competitive" ? (
            <div className="flex-1 min-h-0">
              <ArchitectureCompare />
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <EducationTab />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
