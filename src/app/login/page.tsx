"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter your email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    window.location.href = "/dashboard";
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070707",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.15) 20%, rgba(0,0,0,0.88) 58%, #000 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "88px",
          left: "8%",
          width: "260px",
          height: "260px",
          borderTop: "10px solid rgba(255,255,255,0.88)",
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderRadius: "50% 50% 0 0",
          transform: "rotate(-10deg)",
          opacity: 0.8,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "88px",
          right: "8%",
          width: "260px",
          height: "260px",
          borderTop: "10px solid rgba(255,255,255,0.88)",
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderRadius: "50% 50% 0 0",
          transform: "rotate(10deg)",
          opacity: 0.8,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "138px",
          left: "12%",
          width: "178px",
          height: "22px",
          background:
            "repeating-linear-gradient(to right, #f97316, #f97316 6px, transparent 6px, transparent 12px)",
          boxShadow: "0 0 40px rgba(249,115,22,0.85)",
          transform: "skew(-18deg)",
          borderRadius: "4px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "138px",
          right: "12%",
          width: "178px",
          height: "22px",
          background:
            "repeating-linear-gradient(to right, #3b82f6, #3b82f6 6px, transparent 6px, transparent 12px)",
          boxShadow: "0 0 40px rgba(59,130,246,0.85)",
          transform: "skew(18deg)",
          borderRadius: "4px",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px 16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            background: "#f8f6f3",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 30px 80px rgba(0,0,0,0.40)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Image
              src="/logo.png"
              alt="Swift Tickets"
              width={120}
              height={38}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#efede9",
              borderRadius: 999,
              padding: 5,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                flex: 1,
                textAlign: "center",
                background: "#ffffff",
                color: "#161616",
                fontWeight: 700,
                fontSize: 16,
                padding: "14px 16px",
                borderRadius: 999,
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              }}
            >
              Log in
            </div>

            <Link
              href="/signup"
              style={{
                flex: 1,
                textAlign: "center",
                textDecoration: "none",
                color: "#6c6c6c",
                fontWeight: 600,
                fontSize: 16,
                padding: "14px 16px",
                borderRadius: 999,
              }}
            >
              Sign up
            </Link>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                border: "2px solid #d9d6d1",
                borderRadius: 14,
                padding: "12px 16px 10px",
                background: "#f8f6f3",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#6f6f6f",
                  marginBottom: 5,
                  fontWeight: 500,
                }}
              >
                Email address
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="isabella.swan@example.com"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 18,
                  color: "#222222",
                  fontWeight: 500,
                }}
              />
            </div>

            <div
              style={{
                border: "2px solid #d9d6d1",
                borderRadius: 14,
                padding: "12px 16px 10px",
                background: "#f8f6f3",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#6f6f6f",
                    marginBottom: 5,
                    fontWeight: 500,
                  }}
                >
                  Password
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 18,
                    color: "#222222",
                    fontWeight: 500,
                  }}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Toggle password visibility"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111111"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                background: "#000000",
                color: "#ffffff",
                border: "none",
                borderRadius: 14,
                padding: "18px 20px",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
