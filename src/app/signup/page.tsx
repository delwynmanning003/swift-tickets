"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

      <div className="signup-decor-left-arc" />
      <div className="signup-decor-right-arc" />
      <div className="signup-decor-left-bar" />
      <div className="signup-decor-right-bar" />

      <div className="signup-shell">
        <div className="signup-card">
          <div className="signup-logo-wrap">
            <img
              src="/logo.svg"
              alt="Swift Tickets"
              className="signup-logo"
            />
          </div>

          <div className="signup-switcher">
            <Link
              href={`/login${
                redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""
              }`}
              className="signup-switch-link"
            >
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
                placeholder="isabella.swan@example.com"
                className="signup-input"
              />
            </div>

            <div className="signup-name-grid">
              <div className="signup-field">
                <div className="signup-label">First name</div>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Isabella"
                  className="signup-input"
                />
              </div>

              <div className="signup-field">
                <div className="signup-label">Last name</div>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Swan"
                  className="signup-input"
                />
              </div>
            </div>

            <div className="signup-field signup-password-field">
              <div style={{ flex: 1 }}>
                <div className="signup-label">Password</div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
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

            <div className="signup-phone-wrap">
              <div className="signup-phone-flag">
                <span>🇿🇦</span>
                <span className="signup-flag-arrow">⌄</span>
              </div>

              <div className="signup-phone-field">
                <div className="signup-label">Phone number (Optional)</div>
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
                By checking this box, you agree to our{" "}
                <a href="#" className="signup-link">
                  Terms of Use
                </a>
                , and acknowledge having read our{" "}
                <a href="#" className="signup-link">
                  Privacy Notice
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
        .signup-shell {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px 16px;
        }

        .signup-card {
          width: 100%;
          max-width: 560px;
          background: #f8f6f3;
          border-radius: 22px;
          padding: 22px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
        }

        .signup-logo-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .signup-logo {
          width: 140px;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
        }

        .signup-switcher {
          display: flex;
          align-items: center;
          background: #efede9;
          border-radius: 999px;
          padding: 5px;
          margin-bottom: 16px;
        }

        .signup-switch-link {
          flex: 1;
          text-align: center;
          text-decoration: none;
          color: #6c6c6c;
          font-weight: 600;
          font-size: 16px;
          padding: 14px 16px;
          border-radius: 999px;
        }

        .signup-switch-active {
          flex: 1;
          text-align: center;
          background: #ffffff;
          color: #161616;
          font-weight: 700;
          font-size: 16px;
          padding: 14px 16px;
          border-radius: 999px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .signup-form-grid {
          display: grid;
          gap: 14px;
        }

        .signup-name-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .signup-field {
          border: 2px solid #d9d6d1;
          border-radius: 14px;
          padding: 12px 16px 10px;
          background: #f8f6f3;
        }

        .signup-label {
          font-size: 12px;
          color: #6f6f6f;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .signup-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 18px;
          color: #222222;
          font-weight: 500;
        }

        .signup-password-field {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .signup-eye-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          width: 28px;
          height: 28px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .signup-phone-wrap {
          display: grid;
          grid-template-columns: 100px 1fr;
          border: 2px solid #d9d6d1;
          border-radius: 14px;
          overflow: hidden;
          background: #f8f6f3;
        }

        .signup-phone-flag {
          border-right: 2px solid #d9d6d1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 72px;
          font-size: 22px;
          color: #111111;
        }

        .signup-flag-arrow {
          font-size: 14px;
          color: #6f6f6f;
        }

        .signup-phone-field {
          padding: 12px 16px 10px;
        }

        .signup-checkbox-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          cursor: pointer;
          line-height: 1.45;
          color: #3f3f46;
          font-size: 15px;
          margin-top: 2px;
        }

        .signup-checkbox {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          accent-color: #6b6b6b;
          flex-shrink: 0;
        }

        .signup-link {
          color: #2563eb;
        }

        .signup-submit-btn {
          width: 100%;
          background: #000000;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          padding: 18px 20px;
          font-size: 18px;
          font-weight: 700;
          cursor: ${loading ? "not-allowed" : "pointer"};
          opacity: ${loading ? 0.8 : 1};
        }

        .signup-decor-left-arc,
        .signup-decor-right-arc {
          position: absolute;
          top: 88px;
          width: 260px;
          height: 260px;
          border-top: 10px solid rgba(255, 255, 255, 0.88);
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-radius: 50% 50% 0 0;
          opacity: 0.8;
        }

        .signup-decor-left-arc {
          left: 8%;
          transform: rotate(-10deg);
        }

        .signup-decor-right-arc {
          right: 8%;
          transform: rotate(10deg);
        }

        .signup-decor-left-bar,
        .signup-decor-right-bar {
          position: absolute;
          top: 138px;
          width: 178px;
          height: 22px;
          border-radius: 4px;
        }

        .signup-decor-left-bar {
          left: 12%;
          background: repeating-linear-gradient(
            to right,
            #f97316,
            #f97316 6px,
            transparent 6px,
            transparent 12px
          );
          box-shadow: 0 0 40px rgba(249, 115, 22, 0.85);
          transform: skew(-18deg);
        }

        .signup-decor-right-bar {
          right: 12%;
          background: repeating-linear-gradient(
            to right,
            #3b82f6,
            #3b82f6 6px,
            transparent 6px,
            transparent 12px
          );
          box-shadow: 0 0 40px rgba(59, 130, 246, 0.85);
          transform: skew(18deg);
        }

        @media (max-width: 900px) {
          .signup-decor-left-arc,
          .signup-decor-right-arc {
            width: 180px;
            height: 180px;
            top: 70px;
          }

          .signup-decor-left-bar,
          .signup-decor-right-bar {
            width: 120px;
            height: 16px;
            top: 106px;
          }
        }

        @media (max-width: 640px) {
          .signup-shell {
            padding: 18px 12px;
            align-items: center;
          }

          .signup-card {
            max-width: 100%;
            border-radius: 18px;
            padding: 16px;
          }

          .signup-logo {
            width: 118px;
          }

          .signup-switch-link,
          .signup-switch-active {
            font-size: 14px;
            padding: 12px 10px;
          }

          .signup-name-grid {
            grid-template-columns: 1fr;
          }

          .signup-phone-wrap {
            grid-template-columns: 82px 1fr;
          }

          .signup-phone-flag {
            min-height: 68px;
            font-size: 20px;
          }

          .signup-input {
            font-size: 16px;
          }

          .signup-submit-btn {
            padding: 16px 18px;
            font-size: 17px;
          }

          .signup-checkbox-row {
            font-size: 14px;
          }

          .signup-decor-left-arc,
          .signup-decor-right-arc,
          .signup-decor-left-bar,
          .signup-decor-right-bar {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}