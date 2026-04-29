import type {
  FpComplexity,
  FpFunctionType,
  GscFactorCode,
} from "@/lib/api";

/** IFPUG 权重矩阵（与后端口径一致） */
export const FP_WEIGHTS: Record<FpFunctionType, Record<FpComplexity, number>> =
  {
    EI: { LOW: 3, AVERAGE: 4, HIGH: 6 },
    EO: { LOW: 4, AVERAGE: 5, HIGH: 7 },
    EQ: { LOW: 3, AVERAGE: 4, HIGH: 6 },
    ILF: { LOW: 7, AVERAGE: 10, HIGH: 15 },
    EIF: { LOW: 5, AVERAGE: 7, HIGH: 10 },
  };

export const FP_TYPE_LABEL: Record<FpFunctionType, string> = {
  EI: "外部输入",
  EO: "外部输出",
  EQ: "外部查询",
  ILF: "内部逻辑文件",
  EIF: "外部接口文件",
};

/** 5 类功能项配色（不重复风险等级色） */
export const FP_TYPE_COLOR: Record<FpFunctionType, string> = {
  EI: "oklch(0.6 0.16 200)", // 海蓝
  EO: "oklch(0.55 0.22 295)", // 紫罗兰
  EQ: "oklch(0.62 0.18 165)", // 翡翠
  ILF: "oklch(0.7 0.17 75)", // 琥珀
  EIF: "oklch(0.6 0.22 25)", // 鲜红
};

export const FP_COMPLEXITY_COLOR: Record<FpComplexity, string> = {
  LOW: "oklch(0.62 0.18 165)",
  AVERAGE: "oklch(0.7 0.17 75)",
  HIGH: "oklch(0.6 0.22 25)",
};

/** 14 个 GSC 因子（顺序固定） */
export const GSC_FACTORS: { code: GscFactorCode; label: string }[] = [
  { code: "DATA_COMMUNICATIONS", label: "数据通信" },
  { code: "DISTRIBUTED_DATA_PROCESSING", label: "分布式数据处理" },
  { code: "PERFORMANCE", label: "性能" },
  { code: "HEAVILY_USED_CONFIGURATION", label: "高频使用配置" },
  { code: "TRANSACTION_RATE", label: "事务率" },
  { code: "ONLINE_DATA_ENTRY", label: "在线数据输入" },
  { code: "END_USER_EFFICIENCY", label: "最终用户效率" },
  { code: "ONLINE_UPDATE", label: "在线更新" },
  { code: "COMPLEX_PROCESSING", label: "复杂处理" },
  { code: "REUSABILITY", label: "可复用性" },
  { code: "INSTALLATION_EASE", label: "易安装性" },
  { code: "OPERATIONAL_EASE", label: "易操作性" },
  { code: "MULTIPLE_SITES", label: "多站点" },
  { code: "FACILITATE_CHANGE", label: "易变更性" },
];

export const ORDERED_TYPES: FpFunctionType[] = ["EI", "EO", "EQ", "ILF", "EIF"];

/**
 * 自动复杂度推导（前端预览用，简化版 —— 仅展示，不参与提交）
 * 后端在用户不传 complexity 时也会根据 DET/FTR/RET 推导
 */
export function autoComplexity(
  type: FpFunctionType,
  det: number,
  ftr: number,
  ret: number,
): FpComplexity {
  // 事务类（EI/EO/EQ）按 DET × FTR
  if (type === "EI" || type === "EQ") {
    if (det <= 4 && ftr <= 1) return "LOW";
    if (det >= 16 || ftr >= 3) return "HIGH";
    return "AVERAGE";
  }
  if (type === "EO") {
    if (det <= 5 && ftr <= 1) return "LOW";
    if (det >= 20 || ftr >= 4) return "HIGH";
    return "AVERAGE";
  }
  // 数据类（ILF/EIF）按 DET × RET
  if (det <= 19 && ret <= 1) return "LOW";
  if (det >= 51 || ret >= 6) return "HIGH";
  return "AVERAGE";
}

export function gscScoreColor(rating: number): {
  bg: string;
  fg: string;
  border: string;
} {
  // 0..5 -> oklch lightness 0.96 → 0.5（蓝色调）
  if (rating === 0) {
    return {
      bg: "oklch(0.97 0.005 260)",
      fg: "oklch(0.55 0.02 260)",
      border: "oklch(0.92 0.005 260)",
    };
  }
  const t = rating / 5;
  const l = 0.95 - 0.4 * t;
  const c = 0.04 + 0.14 * t;
  return {
    bg: `oklch(${l.toFixed(3)} ${c.toFixed(3)} 260)`,
    fg: rating >= 3 ? "oklch(0.99 0 0)" : "oklch(0.25 0.05 260)",
    border: `oklch(${(l - 0.05).toFixed(3)} ${c.toFixed(3)} 260)`,
  };
}
