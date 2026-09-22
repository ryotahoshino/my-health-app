import { Route, Routes } from "react-router";
import { AppShell } from "./AppShell";
import { WeightPage } from "../features/weight/WeightPage";
import { TrainingPage } from "../features/training/TrainingPage";
import { StepsPage } from "../features/steps/StepsPage";
import { FoodsPage } from "../features/foods/FoodsPage";

// 各ストーリー(Phase5〜7)で実際の画面に差し替えるまでのプレースホルダー。
const ComingSoon = ({ title }: { title: string }) => {
  return <p>{title}(実装予定)</p>;
};

// ナビゲーションと画面の対応。App.tsx から切り出したのは、Router とフェイクの
// ApiClient を差し替えた状態で画面遷移を検証できるようにするため
// (AppRoutes.stories.tsx)。実行時に使う Router は App.tsx が与える。
export const AppRoutes = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/steps" element={<StepsPage />} />
        <Route path="/foods" element={<FoodsPage />} />
        <Route path="*" element={<ComingSoon title="ホーム" />} />
      </Routes>
    </AppShell>
  );
};
