import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../hooks/useAuth";
interface WordResult {
  wordId: number;
  word: string;
  meaning: string;
  lang: string;
  example: string;
  topic: string;
  translation: string;
  useword: string;
  startIndex: number;
  lastIndex: number;
}

interface WordBook {
  id: number;
  name: string;
}

const LANGUAGES = [
  { value: "English",  label: "영어" },
  { value: "Japanese", label: "일본어" },
  { value: "Chinese",  label: "중국어" },
  { value: "French",   label: "프랑스어" },
  { value: "Spanish",  label: "스페인어" },
];

const TOPICS = ["일상", "비즈니스", "여행", "음식", "스포츠", "기술", "문화", "기타"];

const HighlightedExample = ({
  example, start, end,
}: {
  example: string; start: number; end: number;
}) => {
  if (!example) return null;
  return (
    <p className="text-gray-800 text-sm leading-relaxed">
      {example.slice(0, start)}
      <span className="bg-marker text-gray-900 font-semibold px-0.5 rounded-sm">
        {example.slice(start, end)}
      </span>
      {example.slice(end)}
    </p>
  );
};

const HomePage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ keyword: "", lang: "English", topic: "일상", meaning: "" });
  const [result, setResult] = useState<WordResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ── Usage 상태 ─────────────────────────────────────────────────────
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeMsg, setChargeMsg] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const { data } = await api.get<number>("/api/v2/usage");
      setUsageCount(data);
    } catch {
      setUsageCount(null);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  const handleCharge = async () => {
    setChargeLoading(true);
    setChargeMsg(null);
    try {
      const { data } = await api.post<boolean>("/api/v2/usage");
      if (data === true) {
        setChargeMsg("✅ Usage가 충전되었습니다!");
        await fetchUsage();
      } else {
        setChargeMsg("❌ 충전 요청이 거절되었습니다.");
      }
    } catch {
      setChargeMsg("❌ 충전 요청에 실패했습니다.");
    } finally {
      setChargeLoading(false);
    }
  };

  // ── 단어장 상태 ────────────────────────────────────────────────────
  const [wordBooks, setWordBooks] = useState<WordBook[]>([]);
  const [showWordBookModal, setShowWordBookModal] = useState(false);
  const [newWordBookName, setNewWordBookName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [addLoading, setAddLoading] = useState<number | null>(null); // 추가 중인 wordbookId
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const fetchWordBooks = useCallback(async () => {
    try {
      const { data } = await api.get<WordBook[]>("/api/v2/wordbook/list");
      setWordBooks(data);
    } catch {
      setWordBooks([]);
    }
  }, []);

  // 단어장 모달 열 때 목록 불러오기
  const handleOpenWordBookModal = () => {
    setAddMsg(null);
    fetchWordBooks();
    setShowWordBookModal(true);
  };

  // 단어장 생성
  const handleCreateWordBook = async () => {
    if (!newWordBookName.trim()) return;
    setCreateLoading(true);
    try {
      await api.post("/api/v2/wordbook", { name: newWordBookName.trim() });
      setNewWordBookName("");
      await fetchWordBooks();
    } catch {
      alert("단어장 생성에 실패했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  // 단어장에 단어 추가
  const handleAddToWordBook = async (wordBookId: number) => {
    if (!result) return;
    setAddLoading(wordBookId);
    setAddMsg(null);
    try {
      await api.post("/api/v2/wordbookword", {
        word: result.wordId,
        wordbook: wordBookId,
      });
      setAddMsg("✅ 단어장에 추가되었습니다!");
      setTimeout(() => setShowWordBookModal(false), 800);
    } catch {
      setAddMsg("❌ 이미 추가된 단어이거나 오류가 발생했습니다.");
    } finally {
      setAddLoading(null);
    }
  };
  // ──────────────────────────────────────────────────────────────────

  // ── 회원탈퇴 상태 ──────────────────────────────────────────────────
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const handleWithdraw = async () => {
    setWithdrawLoading(true);
    try {
      await api.get("/api/v2/user/remove");
      sessionStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
    } catch {
      alert("회원 탈퇴에 실패했습니다.");
    } finally {
      setWithdrawLoading(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keyword.trim() || !usageCount) return;

    setError(null);
    setResult(null);
    setLoading(true);
    setSearched(true);

    try {
      const { data } = await api.get<WordResult>("/api/v2/openai/search", {
        params: {
          keyword: form.keyword.trim(),
          lang: form.lang,
          topic: form.topic,
          meaning: form.meaning.trim(),
        },
      });
      setResult(data);
      await fetchUsage();
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError("사용 가능한 횟수를 초과했습니다.");
      } else {
        setError("검색 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ keyword: "", lang: "English", topic: "일상", meaning: "" });
    setResult(null);
    setError(null);
    setSearched(false);
  };

  const hasUsage = usageCount !== null && usageCount > 0;
  const isSearchDisabled = loading || usageLoading || !hasUsage || !form.keyword.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold text-blue-600 tracking-tight">📖 WordBook</h1>
          <div className="flex items-center gap-3 sm:gap-4 whitespace-nowrap">
                  <button
        onClick={() => navigate("/wordbook")}
        className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
      >
        📚 단어장
      </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              회원탈퇴
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Usage 현황 + 충전 카드 ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-md border border-gray-200 p-5 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500">남은 검색 횟수</p>
            {usageLoading ? (
              <div className="h-8 w-16 bg-gray-100 animate-pulse rounded-lg" />
            ) : usageCount === null ? (
              <p className="text-sm text-red-500">조회 실패</p>
            ) : (
              <div className="flex items-end gap-2">
                <span className={`text-4xl font-serif font-bold ${hasUsage ? "text-blue-600" : "text-red-500"}`}>
                  {usageCount}
                </span>
                <span className="text-sm text-gray-400 mb-1">회</span>
              </div>
            )}
            <span className={`self-start text-xs font-medium px-2 py-0.5 rounded-full
              ${hasUsage ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {hasUsage ? "● 검색 가능" : "● 횟수 없음"}
            </span>
          </div>

          <div className="bg-white rounded-md border border-gray-200 p-5 flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500">Usage 충전</p>
              <p className="text-xs text-gray-400 mt-0.5">관리자에게 충전을 요청합니다.</p>
            </div>
            <button
              onClick={handleCharge}
              disabled={chargeLoading}
              className="mt-auto w-full bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-blue-200 disabled:text-blue-300
                         disabled:cursor-not-allowed text-sm font-semibold
                         py-2 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {chargeLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  요청 중...
                </>
              ) : "⚡ 충전 요청"}
            </button>
            {chargeMsg && (
              <p className={`text-xs text-center ${chargeMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                {chargeMsg}
              </p>
            )}
          </div>
        </div>

        {/* ── 검색 카드 ── */}
        <div className={`bg-white rounded-md border border-gray-200 p-6 transition-opacity
                        ${!hasUsage && !usageLoading ? "opacity-60 pointer-events-none" : ""}`}>
          <h2 className="font-serif text-xl font-bold text-gray-900 mb-4">단어 검색</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                단어 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="keyword"
                value={form.keyword}
                onChange={handleChange}
                placeholder="검색할 단어를 입력하세요"
                disabled={!hasUsage}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
                           disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">언어</label>
                <select
                  name="lang"
                  value={form.lang}
                  onChange={handleChange}
                  disabled={!hasUsage}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                             focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 bg-white
                             disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">주제</label>
                <select
                  name="topic"
                  value={form.topic}
                  onChange={handleChange}
                  disabled={!hasUsage}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                             focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 bg-white
                             disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                의미 힌트 <span className="text-xs text-gray-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                name="meaning"
                value={form.meaning}
                onChange={handleChange}
                placeholder="예) 사랑, love, 走る..."
                disabled={!hasUsage}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm
                           focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
                           disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isSearchDisabled}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                           disabled:cursor-not-allowed text-white font-semibold py-2.5
                           rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    검색 중...
                  </>
                ) : "🔍 검색"}
              </button>
              {searched && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-600
                             hover:bg-gray-100 text-sm transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 에러 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-md px-5 py-4 text-center">
            ⚠️ {error}
          </div>
        )}

        {/* ── 결과 카드 ── */}
        {result && (
          <div className="bg-white rounded-md border border-gray-200 p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight break-words">{result.word}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-serif italic text-blue-600 text-sm">
                    {result.lang}
                  </span>
                  <span className="text-gray-500 text-xs border border-gray-300 px-2 py-0.5 rounded-sm empty:hidden">
                    {result.topic}
                  </span>
                </div>
              </div>
              {/* 단어장 추가 버튼 */}
              <button
                onClick={handleOpenWordBookModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0 whitespace-nowrap
                           text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                <span>＋</span> 단어장에 추가
              </button>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500">뜻</p>
              <p className="font-serif text-lg text-gray-900 font-bold">{result.meaning}</p>
              {result.translation && (
                <p className="text-gray-500 text-sm">{result.translation}</p>
              )}
            </div>

            {result.example && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500">예문</p>
                <div className="bg-gray-50 border-l-4 border-blue-600 rounded-r-md px-4 py-3 space-y-1">
                  <HighlightedExample
                    example={result.example}
                    start={result.startIndex}
                    end={result.lastIndex}
                  />
                  {result.useword && (
                    <p className="text-gray-400 text-sm italic">{result.useword}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 초기 안내 */}
        {!searched && !loading && (
          <div className="text-center text-gray-400 py-12 space-y-2">
            <p className="text-4xl">🔎</p>
            <p className="text-sm">단어를 입력하고 검색해보세요.</p>
            <p className="text-xs text-gray-300">AI가 뜻, 예문, 번역을 자동으로 생성합니다.</p>
          </div>
        )}
      </main>

      {/* ── 단어장 추가 모달 ── */}
      {showWordBookModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-md border border-gray-200 border-t-4 border-t-blue-600 shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-gray-900">단어장에 추가</h2>
              <button
                onClick={() => setShowWordBookModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* 새 단어장 생성 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">새 단어장 만들기</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWordBookName}
                  onChange={(e) => setNewWordBookName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateWordBook()}
                  placeholder="단어장 이름 입력"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm
                             focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
                <button
                  onClick={handleCreateWordBook}
                  disabled={createLoading || !newWordBookName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                             text-white text-sm font-semibold px-4 rounded-md transition-colors
                             disabled:cursor-not-allowed"
                >
                  {createLoading ? "..." : "생성"}
                </button>
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* 기존 단어장 목록 */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">내 단어장</p>
              {wordBooks.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  단어장이 없습니다. 위에서 생성해주세요.
                </p>
              ) : (
                <ul className="space-y-2 max-h-52 overflow-y-auto">
                  {wordBooks.map((wb) => (
                    <li key={wb.id}>
                      <button
                        onClick={() => handleAddToWordBook(wb.id)}
                        disabled={addLoading === wb.id}
                        className="w-full flex items-center justify-between px-4 py-3
                                   border border-gray-200 rounded-md hover:bg-blue-50
                                   hover:border-blue-300 transition-colors text-left
                                   disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="font-serif font-bold text-gray-900">📚 {wb.name}</span>
                        {addLoading === wb.id ? (
                          <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <span className="text-xs text-blue-500">추가 →</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {addMsg && (
              <p className={`text-xs text-center font-medium
                ${addMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                {addMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 회원탈퇴 확인 모달 ── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-md border border-gray-200 border-t-4 border-t-blue-600 shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center space-y-2">
              <p className="text-3xl">⚠️</p>
              <h2 className="font-serif text-xl font-bold text-gray-900">회원 탈퇴</h2>
              <p className="text-sm text-gray-500">
                탈퇴하면 저장된 단어장, 검색 기록 등<br />
                <span className="text-red-500 font-semibold">모든 데이터가 영구 삭제</span>됩니다.
                <br />정말 탈퇴하시겠습니까?
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowWithdrawModal(false)}
                disabled={withdrawLoading}
                className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50
                           text-sm font-medium py-2 rounded-md transition-colors disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300
                           text-white text-sm font-semibold py-2 rounded-md transition-colors
                           disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {withdrawLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    처리 중...
                  </>
                ) : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
