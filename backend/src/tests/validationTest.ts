/**
 * Simple test for the updated validation services with static templates
 */

import { StaticNodeTemplatesService } from '../services/staticNodeTemplatesService';
import { ConstraintEnforcementService } from '../services/constraintEnforcement';
import { 
  getTemplateById, 
  getRelationshipsByType,
  hasRelationship,
  validateTemplates 
} from '../config/nodeTemplates';

async function testStaticTemplateValidation() {
  console.log('🧪 Testing Static Template Validation Services\n');

  // Test 1: Validate template configuration
  console.log('1. Testing template configuration validation...');
  const validation = validateTemplates();
  console.log('✅ Template validation result:', validation);
  console.log('');

  // Test 2: Test static service initialization
  console.log('2. Testing static service initialization...');
  const staticService = StaticNodeTemplatesService.getInstance();
  await staticService.initialize();
  const templates = await staticService.getTemplates();
  console.log(`✅ Loaded ${templates.length} templates`);
  console.log('');

  // Test 3: Test template retrieval
  console.log('3. Testing template retrieval...');
  const weighingTemplate = getTemplateById('weighing-area');
  console.log('✅ Weighing area template:', weighingTemplate?.name);
  
  const granulationTemplate = getTemplateById('granulation');
  console.log('✅ Granulation template:', granulationTemplate?.name);
  console.log('');

  // Test 4: Test relationship queries
  console.log('4. Testing relationship queries...');
  const weighingRels = getRelationshipsByType('weighing-area', 'MATERIAL_FLOW');
  console.log(`✅ Weighing area has ${weighingRels.length} MATERIAL_FLOW relationships`);
  
  const weighingProhibited = getRelationshipsByType('weighing-area', 'PROHIBITED_NEAR');
  console.log(`✅ Weighing area has ${weighingProhibited.length} PROHIBITED_NEAR relationships`);
  console.log('');

  // Test 5: Test relationship existence
  console.log('5. Testing relationship existence...');
  const hasFlowToGranulation = hasRelationship('weighing-area', 'granulation', 'ADJACENT_TO');
  console.log(`✅ Weighing area has ADJACENT_TO relationship with granulation: ${hasFlowToGranulation}`);
  
  const hasProhibitionWithWaste = hasRelationship('weighing-area', 'waste-disposal', 'PROHIBITED_NEAR');
  console.log(`✅ Weighing area has PROHIBITED_NEAR relationship with waste disposal: ${hasProhibitionWithWaste}`);
  console.log('');

  // Test 6: Test constraint enforcement service
  console.log('6. Testing constraint enforcement service...');
  const constraintService = new ConstraintEnforcementService();
  
  try {
    const associationResult = await constraintService.associateShapeWithNode({
      shapeId: 'test-shape-1',
      nodeTemplateId: 'weighing-area',
      nodeTemplateName: 'Weighing Area',
      category: 'Production'
    });
    
    console.log('✅ Association result:', {
      success: associationResult.success,
      constraintCount: associationResult.constraints.length,
      templateId: associationResult.templateId
    });
    
    // Test edge superimposition validation
    const edgeValidation = await constraintService.validateEdgeSuperimposition(
      'weighing-area',
      'waste-disposal'
    );
    
    console.log('✅ Edge superimposition validation (weighing-area <-> waste-disposal):', {
      canSuperimpose: edgeValidation.canSuperimpose,
      hasProhibition: edgeValidation.hasProhibition,
      minimumSeparation: edgeValidation.minimumSeparation
    });
    
    // Test connection validation
    const connectionValidation = await constraintService.validateConnection(
      'weighing-area',
      'granulation'
    );
    
    console.log('✅ Connection validation (weighing-area <-> granulation):', {
      isValid: connectionValidation.isValid,
      violationCount: connectionValidation.violations.length,
      suggestionCount: connectionValidation.suggestions.length
    });

  } catch (error) {
    console.error('❌ Error testing constraint enforcement:', error);
  }
  
  console.log('\n🎉 Static template validation testing complete!');
}

// Run the test
if (require.main === module) {
  testStaticTemplateValidation().catch(console.error);
}

export { testStaticTemplateValidation };