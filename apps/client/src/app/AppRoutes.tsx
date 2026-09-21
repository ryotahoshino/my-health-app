import { Link, Route, Routes } from "react-router";
import { WeightPage } from "../features/weight/WeightPage";
import { TrainingPage } from "../features/training/TrainingPage";
import { StepsPage } from "../features/steps/StepsPage";
import { FoodsPage } from "../features/foods/FoodsPage";

// 各ストーリー(Phase4〜7)で実際の画面に差し替えるまでのプレースホルダー。
const ComingSoon = ({ title }: { title: string }) => {
  return <p>{title}(実装予定)</p>;
};

// ナビゲーションと画面の対応。App.tsx から切り出したのは、Router とフェイクの
// ApiClient を差し替えた状態で画面遷移を検証できるようにするため
// (AppRoutes.stories.tsx)。実行時に使う Router は App.tsx が与える。
export const AppRoutes = () => {
  return (
    <>
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
    </>
  );
};
