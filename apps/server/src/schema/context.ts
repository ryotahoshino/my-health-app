import type { WeightRepository } from "../repositories/weightRepository.js";
import type { TrainingSessionRepository } from "../repositories/trainingSessionRepository.js";
import type { StepRecordRepository } from "../repositories/stepRecordRepository.js";

// GraphQL Yogaのcontextファクトリ(index.ts)が返す形と一致させる。
// リポジトリをcontext経由で受け渡すことで、リゾルバはテスト時に
// インメモリDBのリポジトリへ差し替えられる(原則V: 依存を注入して検証する)。
export interface GraphQLContext {
  repositories: {
    weight: WeightRepository;
    training: TrainingSessionRepository;
    steps: StepRecordRepository;
  };
  // 期間集計(FR-016)の「今週」「今月」の経過分判定に使う当日の日付
  // (YYYY-MM-DD)。システムクロックの読み取りはindex.tsのcontextファクトリで
  // 行い、テストでは固定値を注入して決定的に検証する(原則V)。
  today: string;
}
