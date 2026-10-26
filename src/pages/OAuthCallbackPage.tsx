import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import { useAuth } from "../hooks/useAuth";

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const { setAccessToken } = useAuth(); // AuthContext에 추가 필요 (아래 참고)
  const [error, setError] = useState(false);

  useEffect(() => {
    const exchange = async () => {
      try {
        // refreshToken 쿠키 → accessToken 교환
        const { data } = await api.post("/api/v2/jwt/exchange");
        setAccessToken(data.accessToken);
        navigate("/", { replace: true });
      } catch {
        setError(true);
      }
    };
    exchange();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-serif text-red-500 text-lg font-bold">소셜 로그인에 실패했습니다.</p>
        <button
          onClick={() => navigate("/login")}
          className="text-sm text-blue-600 hover:underline"
        >
          로그인 페이지로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="font-serif text-gray-600">로그인 처리 중...</p>
    </div>
  );
};

export default OAuthCallbackPage;
