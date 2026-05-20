import type { AIProvider, RiskAnalysisInput, RiskAnalysisResult, SituationResult } from './aiProvider.interface';
export declare class RuleEngineProvider implements AIProvider {
    readonly name = "RuleEngine";
    isAvailable(): Promise<boolean>;
    analyzeRisk(input: RiskAnalysisInput): Promise<RiskAnalysisResult>;
    assessSituation(): Promise<SituationResult>;
}
//# sourceMappingURL=ruleEngine.provider.d.ts.map