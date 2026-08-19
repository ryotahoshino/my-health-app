import { QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { queryClient } from "./queryClient";
import { theme } from "./theme";

// 各ストーリー(Phase3〜7)で実際の画面に差し替えるまでのプレースホルダー。
function ComingSoon({ title }: { title: string }) {
  return <p>{title}(実装予定)</p>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <nav>
            <Link to="/weight">体重</Link>
            {" | "}
            <Link to="/training">トレーニング</Link>
            {" | "}
            <Link to="/steps">歩数</Link>
            {" | "}
            <Link to="/foods">食材</Link>
          </nav>
          <Routes>
            <Route path="/weight" element={<ComingSoon title="体重記録" />} />
            <Route path="/training" element={<ComingSoon title="トレーニング記録" />} />
            <Route path="/steps" element={<ComingSoon title="歩数記録" />} />
            <Route path="/foods" element={<ComingSoon title="食材一覧" />} />
            <Route path="*" element={<ComingSoon title="ホーム" />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
