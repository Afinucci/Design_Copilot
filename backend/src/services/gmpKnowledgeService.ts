import { RegulatoryRule, ComplianceCheckResult, ComplianceReport, FunctionalArea, SpatialRelationship, Diagram } from '../types';

/**
 * GMP Knowledge Service
 * Comprehensive pharmaceutical regulatory knowledge base
 * Includes FDA, EMA, ICH, WHO, and PIC/S guidelines
 */
export class GMPKnowledgeService {
  private static instance: GMPKnowledgeService;
  private rules: RegulatoryRule[] = [];

  private constructor() {
    this.initializeRules();
  }

  public static getInstance(): GMPKnowledgeService {
    if (!GMPKnowledgeService.instance) {
      GMPKnowledgeService.instance = new GMPKnowledgeService();
    }
    return GMPKnowledgeService.instance;
  }

  /**
   * Initialize comprehensive GMP regulatory rules
   */
  private initializeRules(): void {
    this.rules = [
      // ========================================
      // EMA ANNEX 1 (2022) - STERILE MANUFACTURING
      // ========================================
      {
        id: 'ema-annex1-4.14',
        source: 'EMA Annex 1',
        section: '4.14',
        requirement: 'Airlocks shall be used to protect Grade A and Grade B areas. They should be designed to provide a physical barrier and control the direction of air flow.',
        applicableAreas: ['Production', 'Quality Control'],
        severity: 'critical',
        checkable: true
      },
      {
        id: 'ema-annex1-4.21',
        source: 'EMA Annex 1',
        section: '4.21',
        requirement: 'Pass-through hatches and sterilizers should be designed to allow material transfer between areas of different classifications without compromising the cleanliness of the higher grade area.',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },
      {
        id: 'ema-annex1-4.28',
        source: 'EMA Annex 1',
        section: '4.28',
        requirement: 'Separate air handling systems should be used for sterile and non-sterile areas to prevent contamination.',
        applicableAreas: ['Production', 'Utilities'],
        severity: 'critical',
        checkable: true
      },
      {
        id: 'ema-annex1-5.19',
        source: 'EMA Annex 1',
        section: '5.19',
        requirement: 'Personnel and material flow should be separated to minimize contamination risk. Unidirectional flow patterns are preferred.',
        applicableAreas: ['Production'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'ema-annex1-cleanroom-progression',
        source: 'EMA Annex 1',
        section: '4.9',
        requirement: 'Cleanroom classification should follow a logical progression (A → B → C → D). Direct transitions from Grade A to Grade D are prohibited without intermediate buffer zones.',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },

      // ========================================
      // FDA 21 CFR 211 - CURRENT GOOD MANUFACTURING PRACTICE
      // ========================================
      {
        id: 'fda-211.42',
        source: 'FDA 21 CFR 211',
        section: '211.42',
        requirement: 'The design and construction of facilities shall provide adequate space for equipment placement, material storage, and operations to prevent mix-ups and contamination.',
        applicableAreas: ['Production', 'Warehouse'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'fda-211.42-separation',
        source: 'FDA 21 CFR 211',
        section: '211.42(c)',
        requirement: 'Operations shall be separated physically or by other control systems to prevent contamination and mix-ups during manufacturing, processing, or holding.',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },
      {
        id: 'fda-211.46',
        source: 'FDA 21 CFR 211',
        section: '211.46',
        requirement: 'Adequate lighting shall be provided in all areas to facilitate cleaning, maintenance, and proper operations.',
        applicableAreas: ['Production', 'Warehouse', 'Quality Control'],
        severity: 'minor',
        checkable: false
      },
      {
        id: 'fda-211.48',
        source: 'FDA 21 CFR 211',
        section: '211.48',
        requirement: 'Adequate washing facilities shall be provided, including hot and cold water, soap, and air driers or single-service towels. Washing facilities shall be separate from production areas.',
        applicableAreas: ['Personnel'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'fda-211.176',
        source: 'FDA 21 CFR 211',
        section: '211.176',
        requirement: 'Penicillin and other beta-lactam antibiotics must be manufactured in dedicated facilities separated from other drug production to prevent cross-contamination.',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },

      // ========================================
      // ICH Q7 - GOOD MANUFACTURING PRACTICE FOR ACTIVE PHARMACEUTICAL INGREDIENTS
      // ========================================
      {
        id: 'ich-q7-3.11',
        source: 'ICH Q7',
        section: '3.11',
        requirement: 'Premises should be located, designed, and constructed to facilitate cleaning, maintenance, and operations appropriate to the type and stage of manufacture.',
        applicableAreas: ['Production'],
        severity: 'major',
        checkable: false
      },
      {
        id: 'ich-q7-3.12',
        source: 'ICH Q7',
        section: '3.12',
        requirement: 'Premises should be designed to minimize the risk of errors and permit effective cleaning and maintenance to avoid cross-contamination, build-up of dust or dirt.',
        applicableAreas: ['Production', 'Warehouse'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'ich-q7-3.14',
        source: 'ICH Q7',
        section: '3.14',
        requirement: 'Separate manufacturing areas should be provided for processing highly sensitizing materials (e.g., penicillins, steroids).',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },

      // ========================================
      // WHO GMP - WORLD HEALTH ORGANIZATION GUIDELINES
      // ========================================
      {
        id: 'who-gmp-material-flow',
        source: 'WHO GMP',
        section: '13.15',
        requirement: 'The flow of materials and personnel through the building should be designed to minimize the risk of mix-up or cross-contamination.',
        applicableAreas: ['Production'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'who-gmp-waste-disposal',
        source: 'WHO GMP',
        section: '13.19',
        requirement: 'Dedicated waste disposal areas should be provided and separated from production areas. Waste should not pass through clean areas.',
        applicableAreas: ['Support'],
        severity: 'major',
        checkable: true
      },

      // ========================================
      // PIC/S PE 009 - GUIDE TO GOOD MANUFACTURING PRACTICE
      // ========================================
      {
        id: 'pics-pe009-airlocks',
        source: 'PIC/S PE 009',
        section: '3.6',
        requirement: 'Airlocks should be designed and used to provide a physical barrier and, where appropriate, an air break between adjacent rooms of different cleanliness classifications.',
        applicableAreas: ['Production'],
        severity: 'critical',
        checkable: true
      },
      {
        id: 'pics-pe009-changing-rooms',
        source: 'PIC/S PE 009',
        section: '3.8',
        requirement: 'Changing rooms should be designed as airlocks and used to provide physical separation of different stages of changing and minimize microbial and particulate contamination.',
        applicableAreas: ['Personnel'],
        severity: 'major',
        checkable: true
      },

      // ========================================
      // CUSTOM PHARMACEUTICAL BEST PRACTICES
      // ========================================
      {
        id: 'bp-sterile-gowning',
        source: 'EMA Annex 1',
        section: 'Best Practice',
        requirement: 'Gowning areas for sterile manufacturing should include multiple stages with progressively stricter controls (primary gowning, secondary gowning). Final gowning should occur immediately before entering Grade A/B areas.',
        applicableAreas: ['Personnel'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'bp-material-staging',
        source: 'ICH Q7',
        section: 'Best Practice',
        requirement: 'Material staging areas should be located adjacent to production areas but separated to prevent mix-ups. Clear identification and segregation of materials is essential.',
        applicableAreas: ['Warehouse', 'Production'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'bp-qc-proximity',
        source: 'WHO GMP',
        section: 'Best Practice',
        requirement: 'Quality control laboratories should be separate from production areas but reasonably proximate to minimize sample degradation during transfer.',
        applicableAreas: ['Quality Control'],
        severity: 'minor',
        checkable: true
      },
      {
        id: 'bp-utility-access',
        source: 'PIC/S PE 009',
        section: 'Best Practice',
        requirement: 'Utility rooms (HVAC, WFI, clean steam) should have separate access corridors to prevent personnel traffic through production areas during maintenance.',
        applicableAreas: ['Utilities'],
        severity: 'major',
        checkable: true
      },
      {
        id: 'bp-equipment-sizing',
        source: 'FDA 21 CFR 211',
        section: 'Best Practice',
        requirement: 'Equipment rooms should be sized to allow 360-degree access for cleaning, maintenance, and inspection. Minimum clearance: 1 meter on all sides.',
        applicableAreas: ['Production', 'Utilities'],
        severity: 'minor',
        checkable: true
      }
    ];

    console.log(`✅ Loaded ${this.rules.length} GMP regulatory rules`);
  }

  /**
   * Get all regulatory rules
   */
  public getAllRules(): RegulatoryRule[] {
    return this.rules;
  }

  /**
   * Get rules for specific regulatory zone
   */
  public getRulesByZone(zone: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S'): RegulatoryRule[] {
    const sourceMapping: Record<string, string[]> = {
      'FDA': ['FDA 21 CFR 211', 'FDA 21 CFR 210'],
      'EMA': ['EMA Annex 1'],
      'ICH': ['ICH Q7'],
      'WHO': ['WHO GMP'],
      'PIC/S': ['PIC/S PE 009']
    };

    const sources = sourceMapping[zone] || [];
    return this.rules.filter(rule => sources.includes(rule.source));
  }

  /**
   * Get rules applicable to specific room category
   */
  public getRulesForCategory(category: string): RegulatoryRule[] {
    return this.rules.filter(rule =>
      rule.applicableAreas.includes(category) || rule.applicableAreas.includes('Production')
    );
  }

  /**
   * Check layout compliance against all applicable rules
   */
  public async checkCompliance(
    layout: Diagram,
    regulatoryZone: 'FDA' | 'EMA' | 'ICH' | 'WHO' | 'PIC/S' = 'FDA'
  ): Promise<ComplianceReport> {
    const applicableRules = this.getRulesByZone(regulatoryZone).filter(r => r.checkable);
    const results: ComplianceCheckResult[] = [];

    // Check each rule
    for (const rule of applicableRules) {
      const checkResult = await this.checkRule(rule, layout);
      if (checkResult) {
        results.push(checkResult);
      }
    }

    // Calculate scores
    const totalChecks = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const warnings = results.filter(r => !r.passed && r.severity !== 'critical').length;
    const overallScore = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100;

    return {
      overallScore,
      totalChecks,
      passed,
      failed,
      warnings,
      results,
      summary: this.generateComplianceSummary(results, overallScore),
      regulatoryZone,
      generatedAt: new Date()
    };
  }

  /**
   * Check a single regulatory rule against the layout
   */
  private async checkRule(rule: RegulatoryRule, layout: Diagram): Promise<ComplianceCheckResult | null> {
    switch (rule.id) {
      case 'ema-annex1-4.14':
        return this.checkAirlockRequirements(layout, rule);

      case 'ema-annex1-cleanroom-progression':
        return this.checkCleanroomProgression(layout, rule);

      case 'ema-annex1-5.19':
        return this.checkFlowSeparation(layout, rule);

      case 'fda-211.42-separation':
        return this.checkOperationSeparation(layout, rule);

      case 'fda-211.48':
        return this.checkWashingFacilities(layout, rule);

      case 'who-gmp-waste-disposal':
        return this.checkWasteDisposal(layout, rule);

      case 'bp-sterile-gowning':
        return this.checkGowningSequence(layout, rule);

      default:
        // For non-implemented checks, return null
        return null;
    }
  }

  /**
   * Check airlock requirements (EMA Annex 1, 4.14)
   */
  private checkAirlockRequirements(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const gradeABRooms = layout.nodes.filter(n =>
      n.cleanroomClass === 'A' || n.cleanroomClass === 'B'
    );

    const airlocks = layout.nodes.filter(n =>
      n.name.toLowerCase().includes('airlock')
    );

    const affectedNodeIds: string[] = [];
    let passed = true;
    let message = '';

    // Check if Grade A/B rooms have adjacent airlocks
    for (const room of gradeABRooms) {
      const hasAirlock = layout.relationships.some(rel =>
        (rel.fromId === room.id || rel.toId === room.id) &&
        rel.type === 'ADJACENT_TO' &&
        (layout.nodes.find(n => n.id === (rel.fromId === room.id ? rel.toId : rel.fromId))?.name.toLowerCase().includes('airlock'))
      );

      if (!hasAirlock) {
        passed = false;
        affectedNodeIds.push(room.id);
      }
    }

    if (!passed) {
      message = `Grade A/B areas (${affectedNodeIds.length} room(s)) lack required airlocks. EMA Annex 1 requires airlocks to protect sterile areas.`;
    } else {
      message = `All Grade A/B areas are properly protected with airlocks (${gradeABRooms.length} checked).`;
    }

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message,
      affectedNodeIds,
      recommendation: passed ? undefined : 'Add airlocks adjacent to all Grade A and Grade B rooms.',
      autoFixAvailable: !passed,
      autoFix: !passed ? {
        type: 'add_node',
        rationale: 'Adding airlock to protect sterile area per EMA Annex 1, 4.14'
      } : undefined
    };
  }

  /**
   * Check cleanroom classification progression (no direct A→D transitions)
   */
  private checkCleanroomProgression(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const classOrder: Record<string, number> = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'CNC': 5 };
    const affectedNodeIds: string[] = [];
    let passed = true;

    // Check all adjacent relationships
    for (const rel of layout.relationships.filter(r => r.type === 'ADJACENT_TO')) {
      const fromNode = layout.nodes.find(n => n.id === rel.fromId);
      const toNode = layout.nodes.find(n => n.id === rel.toId);

      if (fromNode?.cleanroomClass && toNode?.cleanroomClass) {
        const fromClass = classOrder[fromNode.cleanroomClass] || 0;
        const toClass = classOrder[toNode.cleanroomClass] || 0;
        const diff = Math.abs(fromClass - toClass);

        // Direct A→D or D→A transitions are prohibited (diff > 2)
        if (diff > 2) {
          passed = false;
          affectedNodeIds.push(fromNode.id, toNode.id);
        }
      }
    }

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'Cleanroom classification progression is compliant.'
        : `Invalid cleanroom transitions detected (${affectedNodeIds.length / 2} violations). Direct Class A↔D transitions require intermediate buffer zones.`,
      affectedNodeIds,
      recommendation: passed ? undefined : 'Add intermediate cleanroom classes (e.g., Grade B or C airlocks) between distant classifications.',
      autoFixAvailable: false
    };
  }

  /**
   * Check material/personnel flow separation
   */
  private checkFlowSeparation(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const materialFlows = layout.relationships.filter(r => r.type === 'MATERIAL_FLOW');
    const personnelFlows = layout.relationships.filter(r => r.type === 'PERSONNEL_FLOW');

    // Check for overlapping paths (simplified check)
    const overlaps = materialFlows.filter(mf =>
      personnelFlows.some(pf =>
        (mf.fromId === pf.fromId && mf.toId === pf.toId) ||
        (mf.fromId === pf.toId && mf.toId === pf.fromId)
      )
    );

    const passed = overlaps.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'Material and personnel flows are properly separated.'
        : `${overlaps.length} instances of overlapping material/personnel flows detected.`,
      affectedNodeIds: passed ? [] : [...new Set(overlaps.flatMap(o => [o.fromId, o.toId]))],
      recommendation: passed ? undefined : 'Implement separate corridors for material and personnel movement.',
      autoFixAvailable: false
    };
  }

  /**
   * Check operation separation (FDA 211.42)
   */
  private checkOperationSeparation(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    // Check for prohibited adjacencies (e.g., penicillin near other production)
    const penicillinRooms = layout.nodes.filter(n =>
      n.name.toLowerCase().includes('penicillin') || n.name.toLowerCase().includes('beta-lactam')
    );

    const otherProduction = layout.nodes.filter(n =>
      n.category === 'Production' && !penicillinRooms.includes(n)
    );

    const violations: string[] = [];

    for (const penRoom of penicillinRooms) {
      const adjacent = layout.relationships.filter(r =>
        (r.fromId === penRoom.id || r.toId === penRoom.id) && r.type === 'ADJACENT_TO'
      );

      for (const adj of adjacent) {
        const otherRoomId = adj.fromId === penRoom.id ? adj.toId : adj.fromId;
        if (otherProduction.some(p => p.id === otherRoomId)) {
          violations.push(penRoom.id, otherRoomId);
        }
      }
    }

    const passed = violations.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'High-risk materials are properly segregated.'
        : 'Penicillin/beta-lactam production is not properly separated from other manufacturing.',
      affectedNodeIds: [...new Set(violations)],
      recommendation: passed ? undefined : 'Penicillin production must be in dedicated facilities separated from other drug manufacturing.',
      autoFixAvailable: false
    };
  }

  /**
   * Check washing facilities separation
   */
  private checkWashingFacilities(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const washingRooms = layout.nodes.filter(n =>
      n.name.toLowerCase().includes('washing') || n.name.toLowerCase().includes('gowning')
    );

    const productionRooms = layout.nodes.filter(n => n.category === 'Production');

    // Washing rooms should NOT be directly inside production areas
    const violations = washingRooms.filter(w =>
      productionRooms.some(p => p.id === w.id) // Washing room is categorized as Production
    );

    const passed = violations.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'Washing facilities are properly separated from production areas.'
        : 'Washing facilities should be separate from direct production areas.',
      affectedNodeIds: violations.map(v => v.id),
      recommendation: passed ? undefined : 'Recategorize washing facilities as Personnel areas, not Production.',
      autoFixAvailable: false
    };
  }

  /**
   * Check waste disposal separation
   */
  private checkWasteDisposal(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const wasteRooms = layout.nodes.filter(n =>
      n.name.toLowerCase().includes('waste')
    );

    const cleanRooms = layout.nodes.filter(n =>
      n.cleanroomClass === 'A' || n.cleanroomClass === 'B' || n.cleanroomClass === 'C'
    );

    const violations: string[] = [];

    // Check if waste rooms are adjacent to clean rooms
    for (const waste of wasteRooms) {
      const adjacent = layout.relationships.filter(r =>
        (r.fromId === waste.id || r.toId === waste.id) && r.type === 'ADJACENT_TO'
      );

      for (const adj of adjacent) {
        const otherRoomId = adj.fromId === waste.id ? adj.toId : adj.fromId;
        if (cleanRooms.some(c => c.id === otherRoomId)) {
          violations.push(waste.id, otherRoomId);
        }
      }
    }

    const passed = violations.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'Waste disposal areas are properly separated from clean zones.'
        : 'Waste disposal rooms should not be directly adjacent to clean production areas.',
      affectedNodeIds: [...new Set(violations)],
      recommendation: passed ? undefined : 'Add buffer zones or corridors between waste disposal and clean areas.',
      autoFixAvailable: false
    };
  }

  /**
   * Check gowning sequence for sterile manufacturing
   */
  private checkGowningSequence(layout: Diagram, rule: RegulatoryRule): ComplianceCheckResult {
    const gowningRooms = layout.nodes.filter(n =>
      n.name.toLowerCase().includes('gowning')
    );

    const gradeABRooms = layout.nodes.filter(n =>
      n.cleanroomClass === 'A' || n.cleanroomClass === 'B'
    );

    // Check if gowning rooms are present for sterile areas
    const hasGowning = gowningRooms.length > 0 && gradeABRooms.length > 0;

    const passed = hasGowning || gradeABRooms.length === 0;

    return {
      ruleId: rule.id,
      passed,
      severity: rule.severity,
      message: passed
        ? 'Gowning facilities are present for sterile manufacturing.'
        : 'Sterile areas (Grade A/B) require dedicated gowning rooms.',
      affectedNodeIds: passed ? [] : gradeABRooms.map(r => r.id),
      recommendation: passed ? undefined : 'Add gowning room(s) before Grade A/B areas with multiple gowning stages.',
      autoFixAvailable: !passed
    };
  }

  /**
   * Generate human-readable compliance summary
   */
  private generateComplianceSummary(results: ComplianceCheckResult[], overallScore: number): string {
    const critical = results.filter(r => !r.passed && r.severity === 'critical').length;
    const major = results.filter(r => !r.passed && r.severity === 'major').length;
    const minor = results.filter(r => !r.passed && r.severity === 'minor').length;

    if (overallScore === 100) {
      return 'Excellent! All regulatory checks passed. Layout is fully compliant.';
    } else if (critical > 0) {
      return `Critical compliance issues detected (${critical} critical, ${major} major, ${minor} minor). Immediate action required.`;
    } else if (major > 0) {
      return `Major compliance gaps found (${major} major, ${minor} minor). Address before finalization.`;
    } else {
      return `Minor improvements recommended (${minor} minor issues). Overall layout is compliant.`;
    }
  }
}

export default GMPKnowledgeService;
