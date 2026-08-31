import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { authenticateRider } from '../services/riderService';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'phone' | 'otp';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function humanizeFirebaseError(code: string, message?: string): string {
  const map: Record<string, string> = {
    'auth/invalid-phone-number':       'Invalid phone number. Make sure the format is correct (e.g. +919876543210).',
    'auth/too-many-requests':          'Too many attempts. Please wait a few minutes and try again.',
    'auth/invalid-verification-code':  'Incorrect OTP. Please check and try again.',
    'auth/code-expired':               'OTP has expired. Please request a new one.',
    'auth/quota-exceeded':             'SMS quota exceeded. Please try again later.',
    'auth/network-request-failed':     'Network error. Check your connection and try again.',
    'auth/captcha-check-failed':       'reCAPTCHA verification failed. Please refresh and try again.',
    'auth/operation-not-allowed':      'Phone sign-in is not enabled. Enable it in the Firebase Console under Authentication → Sign-in method.',
    'auth/internal-error':             'Firebase internal error. This usually means Phone auth is not enabled or the domain is not authorized.',
    'auth/app-not-authorized':         'This app is not authorized. Add the domain to Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/missing-phone-number':       'Phone number is missing. Please re-enter it.',
    'auth/invalid-app-credential':     'App credential is invalid. Check that Phone Authentication is enabled in Firebase Console.',
    'auth/web-storage-unsupported':    'Browser storage is blocked. Please allow cookies/storage for this site.',
    'auth/rejected-credential':        'Credential was rejected. Please try again.',
  };
  if (map[code]) return map[code];
  // For unrecognized codes, show the code so it can be diagnosed
  return `Error (${code || 'unknown'}): ${message || 'Something went wrong. Please try again.'}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
      }
    };
  }, []);

  function startCountdown(seconds = 60) {
    setResendCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function setupRecaptcha(): RecaptchaVerifier {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch { /* ignore */ }
      recaptchaRef.current = null;
    }
    // Use the DOM element directly instead of the ID string for better compatibility
    const container = document.getElementById('recaptcha-container');
    if (!container) throw new Error('reCAPTCHA container not found in DOM.');

    const verifier = new RecaptchaVerifier(firebaseAuth, container, {
      size: 'invisible',
      callback: () => { /* OTP dispatched */ },
      'expired-callback': () => {
        setError('reCAPTCHA expired. Please click Send OTP again.');
      },
    });
    recaptchaRef.current = verifier;
    return verifier;
  }

  async function handleSendOtp() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError('Please enter your phone number.');
      return;
    }
    // Ensure E.164 format — prepend +91 if user skipped it
    const e164 = trimmed.startsWith('+') ? trimmed : `+91${trimmed}`;
    if (!/^\+\d{7,15}$/.test(e164)) {
      setError('Invalid phone number. Example: 9876543210 or +919876543210');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const appVerifier = setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(firebaseAuth, e164, appVerifier);
      confirmationRef.current = confirmation;
      setStep('otp');
      startCountdown(60);
    } catch (err: any) {
      console.error('[Firebase sendOTP error]', err?.code, err?.message, err);
      setError(humanizeFirebaseError(err?.code || '', err?.message));
      // Clear the broken verifier so next attempt starts fresh
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit OTP.');
      return;
    }
    if (!confirmationRef.current) {
      setError('Session expired. Please go back and request a new OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Confirm OTP with Firebase
      const result = await confirmationRef.current.confirm(code);
      const firebaseUser = result.user;

      // Step 2: Get the Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // Step 3: Exchange with the Nexor backend
      const authResponse = await authenticateRider({ idToken });

      // Step 4: Store and redirect
      login(authResponse);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[Verify OTP error]', err);
      if (err?.code && typeof err.code === 'string' && err.code.startsWith('auth/')) {
        // Firebase OTP error (wrong code, expired, etc.)
        setError(humanizeFirebaseError(err.code, err.message));
      } else if (err?.isNetworkError) {
        // Backend unreachable
        setError('Cannot connect to the Nexor server. Make sure the backend is running on port 3000.');
      } else if (err?.status === 403) {
        // Backend: this user is not a registered rider
        setError('This phone number is not registered as a Nexor rider. Please contact Nexor.');
      } else {
        setError(`${err?.message || 'Verification failed. Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setError(null);
    await handleSendOtp();
  }

  // OTP input handlers
  function handleOtpChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      if (step === 'phone') handleSendOtp();
      else handleVerifyOtp();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || '';
      setOtp(newOtp);
      const focusIndex = Math.min(digits.length, 5);
      otpRefs.current[focusIndex]?.focus();
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: 'linear-gradient(160deg, #0D1117 0%, #111827 50%, #161D2B 100%)' }}
    >
      {/* Invisible reCAPTCHA container — must be in DOM at all times */}
      <div id="recaptcha-container" />

      {/* Logo */}
      <div className="mb-10 text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52D5)', boxShadow: '0 8px 32px rgba(108,99,255,0.4)' }}
        >
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Nexor Rider</h1>
        <p className="text-[#9CA3AF] mt-1 text-sm">Delivery Partner Portal</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {step === 'phone' ? (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            loading={loading}
            error={error}
            onSubmit={handleSendOtp}
          />
        ) : (
          <OtpStep
            phone={phone}
            otp={otp}
            otpRefs={otpRefs}
            loading={loading}
            error={error}
            resendCountdown={resendCountdown}
            onOtpChange={handleOtpChange}
            onOtpKeyDown={handleOtpKeyDown}
            onOtpPaste={handleOtpPaste}
            onSubmit={handleVerifyOtp}
            onResend={handleResend}
            onChangePhone={() => {
              setStep('phone');
              setOtp(['', '', '', '', '', '']);
              setError(null);
            }}
          />
        )}
      </div>

      <p className="text-center text-xs text-[#4B5563] mt-6">
        Only registered Nexor delivery partners can sign in.
      </p>
    </div>
  );
}

// ─── Phone Step ───────────────────────────────────────────────────────────────
function PhoneStep({
  phone, setPhone, loading, error, onSubmit,
}: {
  phone: string;
  setPhone: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-white mb-1">Enter your phone number</h2>
      <p className="text-[#9CA3AF] text-sm mb-6">
        We'll send a one-time code to verify your number.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#D1D5DB] mb-2">
          Phone number
        </label>
        <div className="flex gap-2">
          {/* Country code pill */}
          <div className="flex items-center gap-1.5 bg-[#374151] border border-[#4B5563] rounded-2xl px-3 py-4 text-white font-medium text-base flex-shrink-0">
            🇮🇳 +91
          </div>
          <input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            className="input-field flex-1"
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            disabled={loading}
            autoFocus
            maxLength={10}
          />
        </div>
        <p className="text-xs text-[#6B7280] mt-1.5">India (+91) only for this demo.</p>
      </div>

      {error && <ErrorBox message={error} />}

      <button
        className="btn-primary mt-2"
        onClick={onSubmit}
        disabled={loading || phone.length < 10}
      >
        {loading ? <Spinner label="Sending OTP..." /> : 'Send OTP'}
      </button>
    </div>
  );
}

// ─── OTP Step ─────────────────────────────────────────────────────────────────
function OtpStep({
  phone, otp, otpRefs, loading, error, resendCountdown,
  onOtpChange, onOtpKeyDown, onOtpPaste, onSubmit, onResend, onChangePhone,
}: {
  phone: string;
  otp: string[];
  otpRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  loading: boolean;
  error: string | null;
  resendCountdown: number;
  onOtpChange: (i: number, v: string) => void;
  onOtpKeyDown: (i: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onOtpPaste: (e: React.ClipboardEvent) => void;
  onSubmit: () => void;
  onResend: () => void;
  onChangePhone: () => void;
}) {
  const filled = otp.filter(Boolean).length;
  const displayPhone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onChangePhone}
          className="text-[#6C63FF] hover:text-[#5A52D5] transition-colors"
          disabled={loading}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-white">Enter OTP</h2>
      </div>
      <p className="text-[#9CA3AF] text-sm mb-6">
        Sent to <span className="text-white font-medium">{displayPhone}</span>
        <button
          onClick={onChangePhone}
          className="ml-2 text-xs text-[#6C63FF] hover:underline"
          disabled={loading}
        >
          Change
        </button>
      </p>

      {/* 6-digit OTP boxes */}
      <div className="flex gap-2.5 justify-center mb-6" onPaste={onOtpPaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { otpRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => onOtpChange(i, e.target.value)}
            onKeyDown={(e) => onOtpKeyDown(i, e)}
            disabled={loading}
            className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border transition-all duration-150 outline-none
              bg-[#1F2937] text-white
              ${digit ? 'border-[#6C63FF]' : 'border-[#374151]'}
              focus:border-[#6C63FF] focus:shadow-[0_0_0_2px_rgba(108,99,255,0.25)]`}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      <button
        className="btn-primary"
        onClick={onSubmit}
        disabled={loading || filled < 6}
      >
        {loading ? <Spinner label="Verifying..." /> : 'Verify OTP'}
      </button>

      {/* Resend */}
      <div className="text-center mt-4">
        {resendCountdown > 0 ? (
          <p className="text-sm text-[#6B7280]">
            Resend in <span className="text-white font-medium">{resendCountdown}s</span>
          </p>
        ) : (
          <button
            onClick={onResend}
            disabled={loading}
            className="text-sm text-[#6C63FF] hover:underline disabled:opacity-50"
          >
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/50 rounded-xl p-3.5 mb-4">
      <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
      {label}
    </span>
  );
}
