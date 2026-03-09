"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import api from "@/lib/api";
import {
  Bell,
  Shield,
  Wallet,
  Activity,
  History,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form states
  const [newAlert, setNewAlert] = useState({
    type: "PRICE_ABOVE",
    tokenSymbol: "ETH",
    threshold: "",
    gasThreshold: "",
    watchedAddress: "",
  });
  const [profileForm, setProfileForm] = useState({
    email: "",
    username: "",
  });

  // 🛡️ SSR SAFE: Initialize from localStorage ONLY on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = window.localStorage.getItem("token");
      if (savedToken) setToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchAlerts();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setUser(res.data);
      setProfileForm({
        email: res.data.email || "",
        username: res.data.username || "",
      });
      fetchBalance();
    } catch (err) {
      handleLogout();
    }
  };

  const fetchBalance = async () => {
    try {
      const res = await api.get("/users/balance/EVM");
      setBalance(res.data);
    } catch (err) {}
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/alerts");
      setAlerts(res.data);
      if (res.data.length > 0) {
        const logsRes = await api.get(`/alerts/${res.data[0].id}/logs`);
        setAlertLogs(logsRes.data);
      }
    } catch (err) {}
  };

  const handleLogin = async () => {
    if (!address || !chainId) return;
    setLoading(true);
    try {
      const {
        data: { nonce },
      } = await api.post("/auth/nonce", { publicKey: address });
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in with Ethereum to ChainSentinel",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      });
      const preparedMessage = message.prepareMessage();
      const signature = await signMessageAsync({ message: preparedMessage });
      const {
        data: { access_token },
      } = await api.post("/auth/verify", {
        message: preparedMessage,
        signature,
      });

      // 🛡️ SSR SAFE: Save to localStorage
      if (typeof window !== "undefined") {
        window.localStorage.setItem("token", access_token);
      }
      setToken(access_token);
    } catch (err) {
      alert("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // 🛡️ SSR SAFE: Remove from localStorage
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
    }
    setToken(null);
    setUser(null);
    setBalance(null);
    setAlerts([]);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch("/users/profile", profileForm);
      alert("Profile updated!");
      fetchProfile();
    } catch (err) {
      alert("Failed to update profile");
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { type: newAlert.type };
      if (newAlert.type.startsWith("PRICE")) {
        payload.tokenSymbol = newAlert.tokenSymbol;
        payload.threshold = parseFloat(newAlert.threshold);
      } else if (newAlert.type === "GAS_ABOVE") {
        payload.gasThreshold = parseFloat(newAlert.gasThreshold);
      } else if (newAlert.type === "WALLET_ACTIVITY") {
        payload.watchedAddress = newAlert.watchedAddress;
      }

      await api.post("/alerts", payload);
      setIsCreateModalOpen(false);
      fetchAlerts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create alert");
    }
  };

  const handleDeleteAlert = async (id: number) => {
    if (!confirm("Delete this sentinel?")) return;
    try {
      await api.delete(`/alerts/${id}`);
      fetchAlerts();
    } catch (err) {}
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="border-b border-zinc-800 p-4 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-500 w-8 h-8" />
            <span className="text-xl font-bold tracking-tighter">
              CHAINSENTINEL
            </span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8">
        {!token ? (
          <section className="py-24 flex flex-col items-center text-center gap-6">
            <h1 className="text-7xl font-black max-w-3xl leading-[1.1] tracking-tight">
              ON-CHAIN <span className="text-blue-500">SENTINEL</span>
            </h1>
            <p className="text-zinc-400 text-xl max-w-xl">
              Connect your wallet to start building your monitoring grid.
            </p>
            {isConnected && (
              <button
                onClick={handleLogin}
                disabled={loading}
                className="mt-8 bg-white text-black px-10 py-4 rounded-full text-lg font-bold"
              >
                {loading ? "Verifying..." : "Sign In with Ethereum"}
              </button>
            )}
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">
                  Profile Settings
                </h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, email: e.target.value })
                    }
                    placeholder="Email"
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm"
                  />
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        username: e.target.value,
                      })
                    }
                    placeholder="Username"
                    className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="w-full bg-zinc-800 text-white text-xs font-bold py-2 rounded-lg"
                  >
                    Save Profile
                  </button>
                </form>
                <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">
                      Balance
                    </p>
                    <p className="text-xl font-black">
                      {parseFloat(balance?.balance || "0").toFixed(4)}{" "}
                      {balance?.unit || "ETH"}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-zinc-600 hover:text-red-500 text-[10px] font-bold"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 p-6 rounded-2xl flex items-center gap-3 font-bold text-lg hover:bg-blue-700 transition-all"
              >
                <Plus /> Deploy Sentinel
              </button>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="text-blue-500" /> Active Sentinels
              </h2>

              {alerts.length === 0 ? (
                <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 p-12 rounded-3xl text-center text-zinc-500">
                  No active sentinels.
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold">
                          {alert.type.replace("_", " ")}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {alert.tokenSymbol} at ${alert.threshold}
                          {alert.gasThreshold &&
                            `Gas > ${alert.gasThreshold} Gwei`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-zinc-500 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold uppercase text-zinc-500 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" /> Event Log
                </h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  {alertLogs.length === 0 ? (
                    <p className="text-zinc-600 text-sm italic">
                      No recent events.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {alertLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between text-sm"
                        >
                          <span>{log.message}</span>
                          <span className="text-blue-400 font-mono">
                            {log.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Deploy Sentinel</h2>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <select
                className="w-full bg-black border border-zinc-800 rounded-xl p-3"
                value={newAlert.type}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, type: e.target.value })
                }
              >
                <option value="PRICE_ABOVE">Price Above</option>
                <option value="PRICE_BELOW">Price Below</option>
                <option value="GAS_ABOVE">Gas Hike</option>
                <option value="WALLET_ACTIVITY">Wallet Watch</option>
              </select>
              <input
                type="text"
                placeholder="ETH"
                value={newAlert.tokenSymbol}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, tokenSymbol: e.target.value })
                }
                className="w-full bg-black border border-zinc-800 rounded-xl p-3"
              />
              <input
                type="number"
                placeholder="Threshold"
                value={newAlert.threshold}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, threshold: e.target.value })
                }
                className="w-full bg-black border border-zinc-800 rounded-xl p-3"
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-zinc-800 py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 py-3 rounded-xl font-bold"
                >
                  Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
