/**
 * Test script to validate the Static Node Templates system
 * This can be run to ensure the static templates service works correctly
 * before removing the Neo4j NodeTemplate nodes
 */

import { StaticNodeTemplatesService } from '../services/staticNodeTemplatesService';
import { validateTemplates, getAllNodeTemplates, getAllCategories } from '../config/nodeTemplates';

async function runStaticTemplatesTest() {
  console.log('🧪 Starting Static Node Templates Test...');
  console.log('=' .repeat(50));

  // Test 1: Template configuration validation
  console.log('Test 1: Template Configuration Validation');
  const validation = validateTemplates();
  if (validation.valid) {
    console.log('✅ Template configuration is valid');
  } else {
    console.error('❌ Template configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    return false;
  }

  // Test 2: Service initialization
  console.log('\nTest 2: Service Initialization');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    await service.initialize();
    console.log('✅ Service initialized successfully');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }

  // Test 3: Get all templates
  console.log('\nTest 3: Get All Templates');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    const templates = await service.getTemplates();
    console.log(`✅ Retrieved ${templates.length} templates`);
    
    // Verify each template has required properties
    for (const template of templates) {
      if (!template.id || !template.name || !template.category || !template.color || !template.defaultSize) {
        console.error(`❌ Template missing required properties: ${JSON.stringify(template)}`);
        return false;
      }
    }
    console.log('✅ All templates have required properties');
  } catch (error) {
    console.error('❌ Failed to get templates:', error);
    return false;
  }

  // Test 4: Get templates by category
  console.log('\nTest 4: Get Templates by Category');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    const categories = getAllCategories();
    
    for (const category of categories) {
      const templates = await service.getTemplatesByCategory(category);
      console.log(`✅ Category '${category}': ${templates.length} templates`);
      
      // Verify all templates in category have correct category
      for (const template of templates) {
        if (template.category !== category) {
          console.error(`❌ Template ${template.id} has wrong category: expected ${category}, got ${template.category}`);
          return false;
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to get templates by category:', error);
    return false;
  }

  // Test 5: Get template by ID
  console.log('\nTest 5: Get Template by ID');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    const allTemplates = getAllNodeTemplates();
    const testTemplate = allTemplates[0];
    
    const retrievedTemplate = await service.getTemplateById(testTemplate.id);
    if (!retrievedTemplate) {
      console.error(`❌ Failed to retrieve template by ID: ${testTemplate.id}`);
      return false;
    }
    
    if (retrievedTemplate.id !== testTemplate.id || retrievedTemplate.name !== testTemplate.name) {
      console.error(`❌ Retrieved template doesn't match expected template`);
      return false;
    }
    
    console.log(`✅ Successfully retrieved template by ID: ${testTemplate.id}`);
  } catch (error) {
    console.error('❌ Failed to get template by ID:', error);
    return false;
  }

  // Test 6: Search templates
  console.log('\nTest 6: Search Templates');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    
    // Test search by name
    const nameResults = await service.searchTemplates('Weighing');
    if (nameResults.length === 0) {
      console.error('❌ Name search returned no results');
      return false;
    }
    console.log(`✅ Name search 'Weighing': ${nameResults.length} results`);
    
    // Test search by category
    const categoryResults = await service.searchTemplates('Production');
    if (categoryResults.length === 0) {
      console.error('❌ Category search returned no results');
      return false;
    }
    console.log(`✅ Category search 'Production': ${categoryResults.length} results`);
    
    // Test search by cleanroom class
    const cleanroomResults = await service.searchTemplates('Class D');
    console.log(`✅ Cleanroom search 'Class D': ${cleanroomResults.length} results`);
    
  } catch (error) {
    console.error('❌ Failed to search templates:', error);
    return false;
  }

  // Test 7: Get statistics
  console.log('\nTest 7: Get Statistics');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    const stats = await service.getStatistics();
    
    console.log(`✅ Total templates: ${stats.totalTemplates}`);
    console.log(`✅ Categories: ${stats.categoriesCount}`);
    console.log(`✅ Templates with cleanroom class: ${stats.templatesWithCleanroom}`);
    console.log('✅ Templates by category:');
    Object.entries(stats.templatesByCategory).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count}`);
    });
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
    return false;
  }

  // Test 8: Health status
  console.log('\nTest 8: Health Status');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    const health = service.getHealthStatus();
    
    if (health.status !== 'healthy') {
      console.error(`❌ Service health is not healthy: ${health.status}`);
      return false;
    }
    
    console.log('✅ Service health is healthy');
    console.log(`✅ Initialized: ${health.initialized}`);
    console.log(`✅ Templates count: ${health.templatesCount}`);
    console.log(`✅ Categories count: ${health.categoriesCount}`);
  } catch (error) {
    console.error('❌ Failed to get health status:', error);
    return false;
  }

  // Test 9: Template validation
  console.log('\nTest 9: Template ID Validation');
  try {
    const service = StaticNodeTemplatesService.getInstance();
    
    // Test valid ID
    const validId = 'weighing-area';
    const isValid = await service.validateTemplateId(validId);
    if (!isValid) {
      console.error(`❌ Valid template ID '${validId}' was not validated`);
      return false;
    }
    console.log(`✅ Valid ID '${validId}' validated successfully`);
    
    // Test invalid ID
    const invalidId = 'non-existent-template';
    const isInvalid = await service.validateTemplateId(invalidId);
    if (isInvalid) {
      console.error(`❌ Invalid template ID '${invalidId}' was incorrectly validated`);
      return false;
    }
    console.log(`✅ Invalid ID '${invalidId}' correctly rejected`);
  } catch (error) {
    console.error('❌ Failed to validate template IDs:', error);
    return false;
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 All Static Node Templates tests passed!');
  console.log('✅ The static templates system is ready to replace Neo4j NodeTemplates');
  console.log('=' .repeat(50));
  
  return true;
}

// Export the test function for use in other contexts
export { runStaticTemplatesTest };

// If run directly, execute the test
if (require.main === module) {
  runStaticTemplatesTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}