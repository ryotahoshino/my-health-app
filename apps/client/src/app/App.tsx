import { QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { queryClient } from "./queryClient";
import { theme } from "./theme";
import { WeightPage } from "../features/weight/WeightPage";
import { TrainingPage } from "../features/training/TrainingPage";
import { StepsPage } from "../features/steps/StepsPage";
import { FoodsPage } from "../features/foods/FoodsPage";

// 各ストーリー(Phase3〜7)で実際の画面に差し替えるまでのプレースホルダー。
const ComingSoon = ({ title }: { title: string }) => {
  return <p>{title}(実装予定)</p>;
};

export const App = () => {
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
            <Route path="/weight" element={<WeightPage />} />
            <Route path="/training" element={<TrainingPage />} />
            <Route path="/steps" element={<StepsPage />} />
            <Route path="/foods" element={<FoodsPage />} />
            <Route path="*" element={<ComingSoon title="ホーム" />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
