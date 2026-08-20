import React, { useState } from "react";
import { UserRole, UserProfile } from "../../types";
import { authService } from "../../services/authService";
import type { SignUpResult } from "../../services/authService";
import {
  BookOpen,
  Mail,
  Lock,
  Building,
  Phone,
  MapPin,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AuthPagesProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ onLoginSuccess }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole] = useState<UserRole>("press_owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Switch between login and signup — clears all fields and messages
  const switchMode = (toSignup: boolean) => {
    setIsSignup(toSignup);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail("");
    setPassword("");
    setFullName("");
    setBusinessName("");
    setShopLocation("");
    setPhone("");
    setRole("press_owner");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (isSignup) {
        const result: SignUpResult = await authService.signUp({
          email,
          password,
          role,
          fullName,
          businessName,
          phone,
          location: shopLocation,
        });
        // Always show success message and send user to login tab manually
        setSuccessMessage(
          `Account created successfully for ${result.profile.email}. You can now log in.`
        );
        // Switch to login tab after a short delay so user can read the message
        setTimeout(() => switchMode(false), 2000);
      } else {
        const loggedInProfile = await authService.signIn(email, password, role);
        onLoginSuccess(loggedInProfile);
      }
    } catch (err: any) {
      console.error("Auth submit error:", err);
      setErrorMessage(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1fcf1] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-[#2e7d46]/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-green-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Brand Hero Banner */}
        <div className="bg-gradient-to-br from-[#2e7d46] via-[#1e5830] to-[#14532d] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <BookOpen className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black tracking-tight">PressPact</h1>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">About Us</h3>
              <p className="text-xs text-green-50 leading-relaxed font-medium">
                PressPact is a dedicated B2B workspace connecting book lamination presses and
                publishers in Bangladesh. We replace messy paper registers with a transparent,
                digital workflow.
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
        <div className="p-8 lg:p-10 space-y-5 flex flex-col justify-center">
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

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2e7d46]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection — required at both Sign Up and Login (FR-5.1) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Select Your Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("press_owner")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
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
                  onClick={() => setRole("publisher")}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
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

            {/* Signup-only Fields */}
            {isSignup && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      {role === "press_owner" ? "Press / Shop Name" : "Publisher House Name"}
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Business name"
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1700-000000"
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Shop / Office Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Banglabazar, Dhaka"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                      required
                    />
                  </div>
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
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
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
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2e7d46] text-gray-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#2e7d46] text-white font-extrabold text-xs rounded-xl hover:bg-[#256338] transition-colors shadow-md shadow-[#2e7d46]/20 flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isSignup ? "Create Account" : "Log In to Portal"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              {isSignup ? "Already have an account?" : "Need a new account?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(!isSignup)}
                className="font-bold text-[#2e7d46] hover:underline cursor-pointer"
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
