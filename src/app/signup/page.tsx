"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [redirect, setRedirect] = useState("/dashboard");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect");

    if (redirectParam) {
      setRedirect(redirectParam);
    }
  }, []);

  const handleSignup = async () => {
    if (loading) return;

    if (!email || !firstName || !lastName || !password) {
      alert("Please fill in all required fields");
      return;
    }

    if (!acceptedTerms) {
      alert("Please accept the terms to continue");
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedPhone = phone.trim();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            first_name: trimmedFirstName,
            last_name: trimmedLastName,
            phone: trimmedPhone || null,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Account was created, but no user was returned.");
      }

      window.location.href = redirect;
    } catch (error: any) {
      alert(error?.message || "Something went wrong during signup");
    } finally {
      setLoading(false);
    }
  };

  const loginHref =
    redirect && redirect !== "/dashboard"
      ? `/login?redirect=${encodeURIComponent(redirect)}`
      : "/login";

  return (
    <main className="signup-page">
      <div className="signup-bg" />
      <div className="signup-glow signup-glow-left" />
      <div className="signup-glow signup-glow-right" />
      <div className="signup-grid-overlay" />

      <div className="signup-shell">
        <div className="signup-card">
          <div className="signup-logo-wrap">
            <Image
              src="/logo.svg"
              alt="Swift Tickets"
              width={170}
              height={56}
              className="signup-logo"
              priority
            />
          </div>

          <div className="signup-heading">
            <h1>Create your account</h1>
            <p>Join Swift Tickets to buy, sell and manage your event experience.</p>
          </div>

          <div className="signup-switcher">
            <Link href={loginHref} className="signup-switch-link">
              Log in
            </Link>

            <div className="signup-switch-active">Sign up</div>
          </div>

          <div className="signup-form-grid">
            <div className="signup-field">
              <div className="signup-label">Email address</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="signup-input"
              />
            </div>

            <div className="signup-name-grid">
              <div className="signup-field">
                <div className="signup-label">First name</div>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="signup-input"
                />
              </div>

              <div className="signup-field">
                <div className="signup-label">Last name</div>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="signup-input"
                />
              </div>
            </div>

            <div className="signup-field signup-password-field">
              <div className="signup-password-inner">
                <div className="signup-label">Password</div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="signup-input"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="signup-eye-btn"
                aria-label="Toggle password visibility"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>

            <div className="signup-phone-wrap">
              <div className="signup-phone-flag">
                <span>🇿🇦</span>
                <span className="signup-flag-arrow">⌄</span>
              </div>

              <div className="signup-phone-field">
                <div className="signup-label">Phone number (optional)</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="signup-input"
                />
              </div>
            </div>

            <label className="signup-checkbox-row">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="signup-checkbox"
              />
              <span>
                By creating an account, you agree to our{" "}
                <a href="/terms" className="signup-link">
                  Terms of Use
                </a>{" "}
                and acknowledge our{" "}
                <a href="/privacy" className="signup-link">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="signup-submit-btn"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .signup-page {
          min-height: 100vh;
          background: #050505;
          position: relative;
          overflow: hidden;
          font-family:
            ui-sans-serif,
            -apple-system,
            BlinkMacSystemFont,
            "SF Pro Display",
            "Inter",
            "Helvetica Neue",
            Arial,
            sans-serif;
        }

        .signup-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0.15) 18%, rgba(0, 0, 0, 0.9) 55%, #000 100%);
        }

        .signup-glow {
          position: absolute;
          width: 420px;
          height: 420px;
          border-radius: 999px;
          filter: blur(110px);
          opacity: 0.22;
          pointer-events: none;
        }

        .signup-glow-left {
          left: -120px;
          top: 120px;
          background: #f97316;
        }

        .signup-glow-right {
          right: -120px;
          top: 100px;
          background: #3b82f6;
        }

        .signup-grid-overlay {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
          background-size: 38px 38px;
          mask-image: radial-gradient(circle at center, black 35%, transparent 95%);
          opacity: 0.28;
        }

        .signup-shell {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 16px;
        }

        .signup-card {
          width: 100%;
          max-width: 620px;
          background: rgba(248, 246, 243, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 28px;
          padding: 28px;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(14px);
        }

        .signup-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 18px;
        }

        .signup-logo {
          width: 160px;
          height: auto;
          object-fit: contain;
        }

        .signup-heading {
          text-align: center;
          margin-bottom: 18px;
        }

        .signup-heading h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          font-weight: 800;
          color: #111111;
          letter-spacing: -0.04em;
        }

        .signup-heading p {
          margin: 10px 0 0;
          color: #5f5f5f;
          font-size: 15px;
          line-height: 1.6;
        }

        .signup-switcher {
          display: flex;
          align-items: center;
          background: #ece8e3;
          border-radius: 999px;
          padding: 5px;
          margin-bottom: 18px;
        }

        .signup-switch-link {
          flex: 1;
          text-align: center;
          text-decoration: none;
          color: #6c6c6c;
          font-weight: 600;
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 999px;
          transition: 0.2s ease;
        }

        .signup-switch-link:hover {
          color: #111111;
        }

        .signup-switch-active {
          flex: 1;
          text-align: center;
          background: #ffffff;
          color: #161616;
          font-weight: 700;
          font-size: 15px;
          padding: 13px 16px;
          border-radius: 999px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .signup-form-grid {
          display: grid;
          gap: 15px;
        }

        .signup-name-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .signup-field {
          border: 1.5px solid #d8d3cd;
          border-radius: 16px;
          padding: 13px 16px 12px;
          background: #f8f6f3;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .signup-field:focus-within,
        .signup-phone-wrap:focus-within {
          border-color: #111111;
          box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.06);
        }

        .signup-label {
          font-size: 12px;
          color: #6f6f6f;
          margin-bottom: 6px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .signup-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 17px;
          color: #222222;
          font-weight: 500;
        }

        .signup-input::placeholder {
          color: #9a948c;
        }

        .signup-password-field {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .signup-password-inner {
          flex: 1;
        }

        .signup-eye-btn {
          border: none;
          background: transparent;
          color: #111111;
          cursor: pointer;
          width: 34px;
          height: 34px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .signup-phone-wrap {
          display: grid;
          grid-template-columns: 96px 1fr;
          border: 1.5px solid #d8d3cd;
          border-radius: 16px;
          overflow: hidden;
          background: #f8f6f3;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .signup-phone-flag {
          border-right: 1.5px solid #d8d3cd;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 72px;
          font-size: 22px;
          color: #111111;
          background: rgba(255, 255, 255, 0.35);
        }

        .signup-flag-arrow {
          font-size: 14px;
          color: #6f6f6f;
        }

        .signup-phone-field {
          padding: 13px 16px 12px;
        }

        .signup-checkbox-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          cursor: pointer;
          line-height: 1.5;
          color: #3f3f46;
          font-size: 14px;
          margin-top: 2px;
        }

        .signup-checkbox {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #111111;
          flex-shrink: 0;
        }

        .signup-link {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .signup-submit-btn {
          width: 100%;
          background: #000000;
          color: #ffffff;
          border: none;
          border-radius: 16px;
          padding: 18px 20px;
          font-size: 17px;
          font-weight: 700;
          cursor: ${loading ? "not-allowed" : "pointer"};
          opacity: ${loading ? 0.82 : 1};
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .signup-submit-btn:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .signup-shell {
            padding: 24px 12px;
            align-items: center;
          }

          .signup-card {
            max-width: 100%;
            border-radius: 22px;
            padding: 20px;
          }

          .signup-heading h1 {
            font-size: 28px;
          }

          .signup-heading p {
            font-size: 14px;
          }

          .signup-name-grid {
            grid-template-columns: 1fr;
          }

          .signup-phone-wrap {
            grid-template-columns: 84px 1fr;
          }

          .signup-phone-flag {
            min-height: 68px;
            font-size: 20px;
          }

          .signup-input {
            font-size: 16px;
          }

          .signup-submit-btn {
            padding: 17px 18px;
            font-size: 16px;
          }

          .signup-glow {
            width: 280px;
            height: 280px;
            filter: blur(90px);
            opacity: 0.18;
          }
        }
      `}</style>
    </main>
  );
}