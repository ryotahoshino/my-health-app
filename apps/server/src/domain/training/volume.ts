export type ExerciseSetVolumeInput = {
  weightKg: number;
  reps: number;
  sets: number;
};

// 総ボリューム(重量×回数×セット)は消費カロリー算出には使わず、
// トレーニング内容の可視化用の別指標として扱う(FR-010、research.md #5)。
export const calculateTotalVolume = (exerciseSets: ExerciseSetVolumeInput[]): number =>
  exerciseSets.reduce(
    (total, exerciseSet) => total + exerciseSet.weightKg * exerciseSet.reps * exerciseSet.sets,
    0,
  );
