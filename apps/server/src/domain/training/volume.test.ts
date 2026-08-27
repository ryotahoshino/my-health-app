import { describe, expect, it } from "vitest";
// T045で実装する(このテストは実装が無い間は失敗する)
import { calculateTotalVolume } from "./volume.js";

describe("calculateTotalVolume", () => {
  it("単一種目の総ボリューム(重量×回数×セット)を算出する", () => {
    const total = calculateTotalVolume([{ weightKg: 50, reps: 10, sets: 3 }]);
    expect(total).toBe(1500);
  });

  it("複数種目の総ボリュームを合算する", () => {
    const total = calculateTotalVolume([
      { weightKg: 50, reps: 10, sets: 3 },
      { weightKg: 60, reps: 8, sets: 4 },
    ]);
    // 50*10*3=1500, 60*8*4=1920, 合計3420
    expect(total).toBe(3420);
  });

  it("種目が0件の場合は0を返す", () => {
    expect(calculateTotalVolume([])).toBe(0);
  });
});
