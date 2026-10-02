"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Activity, Lock, User, ArrowRight, Sparkles } from "lucide-react";

export default function LoginGateway() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ZERO TRUST: Shred session immediately on arrival
  useEffect(() => {
    sessionStorage.removeItem("hospital_role");
    sessionStorage.removeItem("hospital_user");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("hospital_role", data.role);
        sessionStorage.setItem("hospital_user", data.username);
        
        // Push keeps the gateway in history so the back button triggers the session shredder
        router.push(`/${data.role}`); 
      } else {
        setError("Unrecognized credentials. Access denied.");
      }
    } catch {
      setError("Secure server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden selection:bg-blue-500/30 font-sans">
      {/* Immersive Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      
      <div className="z-10 w-full max-w-md p-10 bg-white/[0.02] border border-white/[0.05] backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        
        <div className="flex flex-col items-center mb-10">
          <div className="relative flex items-center justify-center w-16 h-16 mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-2xl blur-xl opacity-40 animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-white/20">
              <Activity className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 tracking-tight">HealthSync AI</h1>
          <div className="flex items-center gap-1.5 mt-2 text-blue-400/80">
            <Sparkles className="w-3.5 h-3.5" />
            <p className="text-xs font-semibold tracking-widest uppercase">Secure Triage Core</p>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                <User className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors duration-300" />
              </div>
              <input
                type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/60 transition-all text-sm font-medium"
                placeholder="Staff ID"
              />
            </div>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
                <Lock className="h-5 w-5 text-zinc-500 group-focus-within:text-blue-400 transition-colors duration-300" />
              </div>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-black/60 transition-all text-sm font-medium"
                placeholder="Password"
              />
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-semibold text-center animate-in fade-in zoom-in-95 backdrop-blur-md">
              {error}
            </div>
          )}
          
          <button 
            type="submit" disabled={loading}
            className="group relative w-full flex justify-center items-center gap-2 py-4 mt-6 bg-white hover:bg-zinc-100 text-black disabled:bg-white/10 disabled:text-white/30 font-bold rounded-2xl transition-all duration-300 text-sm active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          >
            {loading ? "Authenticating..." : "Initialize Session"}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />}
          </button>
        </form>
      </div>
    </main>
  );
}