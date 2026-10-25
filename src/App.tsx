import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./auth/PrivateRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage"; // 👈 1. 회원가입 페이지 불러오기 추가!
import HomePage from "./pages/HomePage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import WordBookPage from "./pages/WordBookPage";
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 누구나 접근 가능한 공개 페이지들 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} /> {/* 👈 2. 라우트 추가! */}
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          {/* 로그인한 사람만 들어갈 수 있는 보호 구역 */}
          <Route element={<PrivateRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/wordbook" element={<WordBookPage />} />
          </Route>
          
          {/* 이상한 주소로 접속하면 대시보드(또는 로그인)로 튕겨내기 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;