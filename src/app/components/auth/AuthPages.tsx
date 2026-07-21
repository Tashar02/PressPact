import React, { useState } from "react";
import { UserRole } from "../../types";
import {
  BookOpen,
  Mail,
  Lock,
  User,
  Building,
  MapPin,
  Phone,
  ArrowRight,
  CheckCircle2,
  Layers,
} from "lucide-react";

interface AuthPagesProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState<UserRole>("press_owner");
  const [email, setEmail] = useState("rahim@novalamination.bd");
  const [password, setPassword] = useState("••••••••");
  const [fullName, setFullName] = useState("Md. Abdur Rahim");
  const [businessName, setBusinessName] = useState("Nova Lamination");
  const [shopLocation, setShopLocation] = useState("38/2 Banglabazar, Dhaka");
  const [phone, setPhone] = useState("+880 1711-456789");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess(role);
  };

  return (
    <div className="min-h-screen bg-[#f1fcf1] flex items-center justify-center p-4">
      {/* Background decoration for PC desktop view */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-[#2e7d46]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-green-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Brand Hero Banner (PC desktop design) */}
        <div className="bg-gradient-to-br from-[#2e7d46] via-[#1e5830] to-[#14532d] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl font-sans" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black tracking-tight">PressPact</h1>
            </div>

            {/* About Us section */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">About Us</h3>
              <p className="text-xs text-green-50 leading-relaxed font-medium">
                PressPact is a dedicated B2B workspace connecting book lamination presses and publishers in Bangladesh. We replace the messy paper receipts and verbal arguments with a transparent, digital workflow.
              </p>
            </div>
          </div>

          <div className="space-y-2 relative z-10 py-6 border-t border-b border-white/10 my-4">
            <div className="flex items-center gap-2 text-[11px] text-green-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Digital Proof Approval Gate</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-green-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Real-Time Yield Math Validator</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-green-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Film Stock &amp; Material Calculator</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-green-100">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Credit-Hold Account Governance</span>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-green-200/70 space-y-0.5">
            <p className="font-semibold text-white">Author: Tashfin Shakeer Rhythm</p>
            <div className="flex items-center justify-between text-[10px] opacity-90">
              <span>Version 1.0</span>
              <span>© 2026 PressPact. All rights reserved.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 lg:p-10 space-y-6 flex flex-col justify-center">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">
              {isSignup ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isSignup
                ? "Register your press shop or publisher account"
                : "Sign in to manage your digital workflow"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection (FR-5.1) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Select Your Operating Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole("press_owner");
                    setEmail("rahim@novalamination.bd");
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    role === "press_owner"
                      ? "bg-emerald-50 border-[#2e7d46] text-[#2e7d46] ring-2 ring-[#2e7d46]/20"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>Press Owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole("publisher");
                    setEmail("mithu@sagorikabooks.bd");
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                    role === "publisher"
                      ? "bg-emerald-50 border-[#2e7d46] text-[#2e7d46] ring-2 ring-[#2e7d46]/20"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Publisher Client</span>
                </button>
              </div>
            </div>

            {/* Registration Fields (FR-5.2) */}
            {isSignup && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Shop Location</label>
                  <input
                    type="text"
                    value={shopLocation}
                    onChange={(e) => setShopLocation(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                    required
                  />
                </div>
              </>
            )}

            {/* Email & Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#2e7d46] text-white font-extrabold text-xs rounded-xl hover:bg-[#256338] transition-colors shadow-md shadow-[#2e7d46]/20 flex items-center justify-center gap-2"
            >
              <span>{isSignup ? "Create Account & Login" : "Log In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              {isSignup ? "Already have an account?" : "Need a new account?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignup(!isSignup)}
                className="font-bold text-[#2e7d46] hover:underline"
              >
                {isSignup ? "Log In" : "Sign Up"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
