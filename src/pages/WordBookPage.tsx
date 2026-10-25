import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";

interface WordBookListItem {
  id: number;
  name: string;
  count: number;
  likeCount: number;
}

interface WordDetail {
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

interface WordBookDetail {
  id: number;
  name: string;
  likeCount: number;
  words: WordDetail[];
}

type Tab = "my" | "popular";

const HighlightedExample = ({ example, start, end }: { example: string; start: number; end: number }) => {
  if (!example) return null;
  return (
    <span className="text-gray-600 text-sm leading-relaxed">
      {example.slice(0, start)}
      <mark className="bg-yellow-100 text-yellow-800 font-medium px-0.5 rounded not-italic">
        {example.slice(start, end)}
      </mark>
      {example.slice(end)}
    </span>
  );
};

const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const MEDAL = ["🥇", "🥈", "🥉"];

const WordBookPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("my");
  const [selectedWordBook, setSelectedWordBook] = useState<WordBookDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [myWordBooks, setMyWordBooks] = useState<WordBookListItem[]>([]);
  const [myListLoading, setMyListLoading] = useState(true);

  const [popularWordBooks, setPopularWordBooks] = useState<WordBookListItem[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);

  const [likeLoading, setLikeLoading] = useState<number | null>(null);
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [deleteWbLoading, setDeleteWbLoading] = useState<number | null>(null);
  const [deleteWordLoading, setDeleteWordLoading] = useState<number | null>(null);

  const fetchMyWordBooks = useCallback(async () => {
    setMyListLoading(true);
    try {
      const { data } = await api.get<WordBookListItem[]>("/api/v2/wordbook/mylist");
      setMyWordBooks(data);
    } catch {
      setMyWordBooks([]);
    } finally {
      setMyListLoading(false);
    }
  }, []);

  const fetchPopularWordBooks = useCallback(async () => {
    setPopularLoading(true);
    try {
      const { data } = await api.get<WordBookListItem[]>("/api/v2/wordbook/list", {
        params: { page: 0, size: 20, sort: "likeCount,desc" },
      });
      setPopularWordBooks(data);
    } catch {
      setPopularWordBooks([]);
    } finally {
      setPopularLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWordBooks();
    fetchPopularWordBooks();
  }, [fetchMyWordBooks, fetchPopularWordBooks]);

  const handleSelectWordBook = async (id: number) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get<WordBookDetail>("/api/v2/wordbook", { params: { id } });
      setSelectedWordBook({ ...data, id });
    } catch {
      alert("단어장을 불러오는데 실패했습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLike = async (wordbookId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (likeLoading === wordbookId) return;
    setLikeLoading(wordbookId);
    const isLiked = likedSet.has(wordbookId);
    const delta = isLiked ? -1 : 1;
    try {
      await api.post(`/api/v2/wordbooklike/${wordbookId}`);
      setLikedSet((prev) => {
        const next = new Set(prev);
        isLiked ? next.delete(wordbookId) : next.add(wordbookId);
        return next;
      });
      const updateList = (list: WordBookListItem[]) =>
        list.map((wb) => wb.id === wordbookId ? { ...wb, likeCount: wb.likeCount + delta } : wb);
      setMyWordBooks(updateList);
      setPopularWordBooks(updateList);
      if (selectedWordBook?.id === wordbookId)
        setSelectedWordBook((prev) => prev ? { ...prev, likeCount: prev.likeCount + delta } : prev);
    } catch {
      alert("좋아요 처리에 실패했습니다.");
    } finally {
      setLikeLoading(null);
    }
  };

  const handleDeleteWordBook = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("단어장을 삭제하시겠습니까?")) return;
    setDeleteWbLoading(id);
    try {
      await api.delete("/api/v2/wordbook", { params: { id } });
      if (selectedWordBook?.id === id) setSelectedWordBook(null);
      await fetchMyWordBooks();
    } catch {
      alert("단어장 삭제에 실패했습니다.");
    } finally {
      setDeleteWbLoading(null);
    }
  };

  const handleDeleteWord = async (wordId: number) => {
    if (!selectedWordBook || !confirm("이 단어를 단어장에서 제거하시겠습니까?")) return;
    setDeleteWordLoading(wordId);
    try {
      await api.delete("/api/v2/wordbookword", {
        params: { wordBookId: selectedWordBook.id, wordId },
      });
      await handleSelectWordBook(selectedWordBook.id);
    } catch {
      alert("단어 삭제에 실패했습니다.");
    } finally {
      setDeleteWordLoading(null);
    }
  };

  // ── 공통 좋아요 버튼 ───────────────────────────────────────────────
  const LikeButton = ({ id, count, size = "md" }: { id: number; count: number; size?: "sm" | "md" }) => {
    const liked = likedSet.has(id);
    const isLoading = likeLoading === id;
    const base = size === "sm"
      ? "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
      : "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all";
    return (
      <button
        onClick={(e) => handleLike(id, e)}
        disabled={isLoading}
        className={`${base} ${liked
          ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
          : "bg-gray-100 text-gray-500 hover:bg-rose-50 hover:text-rose-500"
        } disabled:cursor-not-allowed`}
      >
        {isLoading
          ? <Spinner className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
          : <svg viewBox="0 0 24 24" className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
              fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        }
        <span>{count}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => selectedWordBook ? setSelectedWordBook(null) : navigate("/")}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-bold text-gray-900">
            {selectedWordBook ? selectedWordBook.name : "단어장"}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {selectedWordBook ? (
          /* ── 단어장 상세 ── */
          <div className="space-y-3">
            {/* 단어장 정보 바 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                단어 <strong className="text-gray-900">{selectedWordBook.words?.length ?? 0}</strong>개
              </span>
              <LikeButton id={selectedWordBook.id} count={selectedWordBook.likeCount} />
            </div>

            {!selectedWordBook.words || selectedWordBook.words.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                <svg viewBox="0 0 24 24" className="h-12 w-12 text-gray-200" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <p className="text-sm">아직 단어가 없습니다</p>
                <button onClick={() => navigate("/")}
                  className="text-xs text-blue-500 hover:underline">
                  단어 검색하러 가기 →
                </button>
              </div>
            ) : (
              selectedWordBook.words.map((word) => (
                <div key={word.wordId}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* 단어 헤더 */}
                  <div className="px-5 pt-5 pb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-xl font-bold text-gray-900">{word.word}</h3>
                        <span className="text-xs text-gray-400">{word.lang}</span>
                      </div>
                      <p className="text-gray-700 mt-1 text-sm">{word.meaning}</p>
                      {word.translation && (
                        <p className="text-gray-400 text-xs mt-0.5">{word.translation}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteWord(word.wordId)}
                      disabled={deleteWordLoading === word.wordId}
                      className="ml-3 w-7 h-7 flex items-center justify-center rounded-full
                                 text-gray-300 hover:text-red-400 hover:bg-red-50
                                 transition-colors disabled:cursor-not-allowed flex-shrink-0"
                    >
                      {deleteWordLoading === word.wordId
                        ? <Spinner className="h-3.5 w-3.5 text-gray-400" />
                        : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                      }
                    </button>
                  </div>

                  {/* 예문 */}
                  {word.example && (
                    <div className="mx-5 mb-4 px-4 py-3 bg-gray-50 rounded-xl border-l-2 border-blue-200">
                      <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">예문</p>
                      <HighlightedExample
                        example={word.example}
                        start={word.startIndex}
                        end={word.lastIndex}
                      />
                      {word.useword && (
                        <p className="text-gray-400 text-xs mt-1.5 italic">{word.useword}</p>
                      )}
                    </div>
                  )}

                  {/* 태그 */}
                  <div className="px-5 pb-4">
                    <span className="inline-block bg-purple-50 text-purple-600 text-xs
                                     font-medium px-2 py-0.5 rounded-md">
                      {word.topic}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── 목록 뷰 ── */
          <div className="space-y-4">
            {/* 탭 */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {([["my", "내 단어장"], ["popular", "인기 단어장"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                    ${tab === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── 내 단어장 ── */}
            {tab === "my" && (
              myListLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-[76px] animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : myWordBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                  <svg viewBox="0 0 24 24" className="h-12 w-12 text-gray-200" fill="none"
                    stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">아직 단어장이 없어요</p>
                  <button onClick={() => navigate("/")}
                    className="text-xs text-blue-500 hover:underline">
                    단어 검색 후 단어장 만들기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myWordBooks.map((wb) => (
                    <div
                      key={wb.id}
                      onClick={() => handleSelectWordBook(wb.id)}
                      className="bg-white rounded-2xl border border-gray-100 px-5 py-4
                                 flex items-center justify-between cursor-pointer
                                 hover:border-blue-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center
                                        justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue-500" fill="none"
                            stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{wb.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">단어 {wb.count ?? 0}개</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        <LikeButton id={wb.id} count={wb.likeCount} size="sm" />
                        <button
                          onClick={(e) => handleDeleteWordBook(wb.id, e)}
                          disabled={deleteWbLoading === wb.id}
                          className="w-7 h-7 flex items-center justify-center rounded-full
                                     text-gray-300 hover:text-red-400 hover:bg-red-50
                                     transition-colors disabled:cursor-not-allowed"
                        >
                          {deleteWbLoading === wb.id
                            ? <Spinner className="h-3.5 w-3.5 text-gray-400" />
                            : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                                stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── 인기 단어장 ── */}
            {tab === "popular" && (
              popularLoading ? (
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl h-[76px] animate-pulse border border-gray-100" />
                  ))}
                </div>
              ) : popularWordBooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
                  <svg viewBox="0 0 24 24" className="h-12 w-12 text-gray-200" fill="none"
                    stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  <p className="text-sm">아직 인기 단어장이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {popularWordBooks.map((wb, idx) => (
                    <div
                      key={wb.id}
                      onClick={() => handleSelectWordBook(wb.id)}
                      className="bg-white rounded-2xl border border-gray-100 px-5 py-4
                                 flex items-center justify-between cursor-pointer
                                 hover:border-blue-200 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* 순위 */}
                        <div className={`w-10 h-10 flex items-center justify-center
                                         rounded-xl flex-shrink-0 text-lg
                                         ${idx < 3 ? "" : "bg-gray-50"}`}>
                          {idx < 3
                            ? MEDAL[idx]
                            : <span className="text-sm font-bold text-gray-400">{idx + 1}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{wb.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">단어 {wb.count ?? 0}개</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <LikeButton id={wb.id} count={wb.likeCount} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </main>

      {/* 로딩 오버레이 */}
      {detailLoading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center
                        justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-5 flex items-center gap-3
                          shadow-xl border border-gray-100">
            <Spinner className="h-5 w-5 text-blue-500" />
            <p className="text-sm font-medium text-gray-700">불러오는 중</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordBookPage;