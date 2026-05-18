/**
 * AI Provider 抽象接口
 * 规则引擎为默认 fallback；未来接入真实 AI 模型时实现此接口即可。
 */

export interface RiskAnalysisInput {
  scene: string;
  inputData?: Record<string, unknown>;
}

export interface RiskAnalysisResult {
  riskLevel: 'low' | 'medium' | 'high';
  suggestion: string;
  confidence: number;
  analysis: {
    alarmFreq: number;
    faultCount: number;
    fireCount: number;
  };
}

export interface SituationResult {
  situation: 'normal' | 'warning' | 'danger';
  onlineRate: string;
  todayAlarm: number;
}

export interface AIProvider {
  readonly name: string;

  /** 风险研判 */
  analyzeRisk(input: RiskAnalysisInput): Promise<RiskAnalysisResult>;

  /** 态势评估 */
  assessSituation(): Promise<SituationResult>;

  /** 是否可用（模型服务在线） */
  isAvailable(): Promise<boolean>;
}
