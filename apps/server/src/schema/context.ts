import type { WeightRepository } from "../repositories/weightRepository.js";
import type { TrainingSessionRepository } from "../repositories/trainingSessionRepository.js";

// GraphQL Yogaのcontextファクトリ(index.ts)が返す形と一致させる。
// リポジトリをcontext経由で受け渡すことで、リゾルバはテスト時に
// インメモリDBのリポジトリへ差し替えられる(原則V: 依存を注入して検証する)。
export interface GraphQLContext {
  repositories: {
    weight: WeightRepository;
    training: TrainingSessionRepository;
  };
}
