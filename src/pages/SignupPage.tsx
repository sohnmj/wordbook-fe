import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosInstance";

type Step = "email" | "verify" | "register";

const steps = [
  { key: "email",    label: "이메일" },
  { key: "verify",   label: "인증" },
  { key: "register", label: "가입" },
];

const Spinner = () => (
  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const InputField = ({
  label, type = "text", value, onChange, placeholder, error, hint, autoFocus = false,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`w-full rounded-md px-4 py-2.5 text-sm border transition-colors
                  focus:outline-none focus:ring-2
                  ${error
                    ? "border-red-300 focus:ring-red-200 bg-red-50"
                    : "border-gray-300 focus:ring-blue-600/20 focus:border-blue-600 bg-white"}`}
    />
    {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
    {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const SignupPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentIdx = steps.findIndex((s) => s.key === step);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/v2/mail", { email });
      setSuccessMsg(`${email}으로 인증코드를 발송했습니다.`);
      setStep("verify");
    } catch {
      setError("인증코드 발송에 실패했습니다. 이메일을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/api/v2/mail/verify", { email, code });
      if (!data) throw new Error();
      setSuccessMsg("이메일 인증이 완료되었습니다!");
      setStep("register");
    } catch {
      setError("인증코드가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/v2/user", {
        username: form.username,
        password: form.password,
        email,
      });
      navigate("/login", { state: { message: "회원가입이 완료되었습니다. 로그인해주세요." } });
    } catch (err: any) {
      setError(err.response?.data?.message ?? "이미 사용 중인 아이디나 이메일일 수 있습니다.");
    } finally {
      setLoading(false);
    }
  };

  const pwMatch = form.confirmPassword && form.password === form.confirmPassword;
  const pwMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <p className="font-serif text-3xl font-bold text-blue-600 tracking-tight mb-2">WordBook</p>
          <h1 className="text-base font-semibold text-gray-900">WordBook 가입</h1>
          <p className="text-sm text-gray-500 mt-1">나만의 단어장을 만들어보세요</p>
        </div>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center mb-8 px-2">
          {steps.map((s, idx) => (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                 text-xs font-bold transition-all duration-300
                                 ${idx < currentIdx
                                   ? "bg-blue-600 text-white"
                                   : idx === currentIdx
                                   ? "bg-blue-600 text-white ring-4 ring-blue-100"
                                   : "bg-gray-100 text-gray-400"}`}>
                  {idx < currentIdx
                    ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                        stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    : idx + 1
                  }
                </div>
                <span className={`text-xs font-medium transition-colors
                  ${idx === currentIdx ? "text-blue-600" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors duration-300
                  ${idx < currentIdx ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-md border border-gray-200 border-t-4 border-t-blue-600 p-6 space-y-5">

          {/* 성공 메시지 */}
          {successMsg && (
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-100
                            rounded-md px-4 py-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100
                            rounded-md px-4 py-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0"
                fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ── Step 1: 이메일 ── */}
          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <InputField
                label="이메일"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="example@email.com"
                hint="인증코드를 받을 이메일을 입력해주세요"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                           disabled:cursor-not-allowed text-white font-semibold py-2.5
                           rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner /> 발송 중...</> : "인증코드 받기"}
              </button>
            </form>
          )}

          {/* ── Step 2: 인증코드 ── */}
          {step === "verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">인증코드</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="코드 6자리 입력"
                  maxLength={10}
                  autoFocus
                  className="w-full rounded-md px-4 py-2.5 text-center text-xl font-bold
                             tracking-[0.5em] border border-gray-300 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-600/20
                             focus:border-blue-600 transition-colors"
                />
                <p className="text-xs text-gray-400 text-center">
                  <span className="font-medium text-gray-600">{email}</span>으로 발송됨
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !code}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                           disabled:cursor-not-allowed text-white font-semibold py-2.5
                           rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner /> 확인 중...</> : "인증 확인"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); setSuccessMsg(null); setCode(""); }}
                className="w-full text-sm text-gray-400 hover:text-blue-600 transition-colors
                           flex items-center justify-center gap-1"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"
                  stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                이메일 다시 입력
              </button>
            </form>
          )}

          {/* ── Step 3: 정보 입력 ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <InputField
                label="아이디"
                value={form.username}
                onChange={(v) => setForm({ ...form, username: v })}
                placeholder="사용할 아이디를 입력하세요"
                autoFocus
              />
              <InputField
                label="비밀번호"
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                placeholder="8자 이상 입력"
                hint={form.password && form.password.length < 8 ? "8자 이상 입력해주세요" : undefined}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">비밀번호 확인</label>
                <div className="relative">
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="비밀번호 재입력"
                    className={`w-full rounded-md px-4 py-2.5 pr-10 text-sm border transition-colors
                                focus:outline-none focus:ring-2
                                ${pwMismatch
                                  ? "border-red-300 focus:ring-red-200 bg-red-50"
                                  : pwMatch
                                  ? "border-green-300 focus:ring-green-100 bg-green-50"
                                  : "border-gray-300 focus:ring-blue-600/20 focus:border-blue-600 bg-white"}`}
                  />
                  {/* 일치 여부 아이콘 */}
                  {form.confirmPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {pwMatch
                        ? <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-500" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        : <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-400" fill="none"
                            stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                      }
                    </div>
                  )}
                </div>
                {pwMismatch && (
                  <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !form.username || !pwMatch}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                           disabled:cursor-not-allowed text-white font-semibold py-2.5
                           rounded-md transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <><Spinner /> 처리 중...</> : "가입 완료"}
              </button>
            </form>
          )}
        </div>

        {/* 로그인 링크 */}
        <p className="text-sm text-center text-gray-500 mt-5">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
