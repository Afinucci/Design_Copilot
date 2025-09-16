/**
 * NodeTemplate Cleanup Migration
 * 
 * This script removes NodeTemplate nodes and their relationships from Neo4j
 * since we've migrated to a static template system.
 * 
 * WARNING: This will permanently remove all NodeTemplate nodes from the database.
 * Make sure to backup your database before running this migration.
 * 
 * User data (FunctionalArea nodes, Diagrams, etc.) will be preserved.
 */

import Neo4jService from '../config/database';

export class NodeTemplateCleanup {
  private driver = Neo4jService.getInstance().getDriver();

  /**
   * Get statistics about NodeTemplate nodes before cleanup
   */
  async getCleanupStats(): Promise<{
    nodeTemplateCount: number;
    relationshipCount: number;
    affectedRelationshipTypes: string[];
  }> {
    const session = this.driver.session();
    
    try {
      // Count NodeTemplate nodes
      const nodeCountResult = await session.run(
        'MATCH (nt:NodeTemplate) RETURN count(nt) as count'
      );
      const nodeTemplateCount = nodeCountResult.records[0]?.get('count')?.low || 0;

      // Count relationships involving NodeTemplate nodes
      const relCountResult = await session.run(
        'MATCH (nt1:NodeTemplate)-[r]-(nt2:NodeTemplate) RETURN count(r) as count'
      );
      const relationshipCount = relCountResult.records[0]?.get('count')?.low || 0;

      // Get relationship types involving NodeTemplates
      const relTypesResult = await session.run(
        'MATCH (nt1:NodeTemplate)-[r]-(nt2:NodeTemplate) RETURN DISTINCT type(r) as relType'
      );
      const affectedRelationshipTypes = relTypesResult.records.map(
        record => record.get('relType')
      );

      return {
        nodeTemplateCount,
        relationshipCount,
        affectedRelationshipTypes
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Verify that no user data will be affected by the cleanup
   */
  async verifyUserDataSafety(): Promise<{
    safe: boolean;
    functionalAreaCount: number;
    diagramCount: number;
    crossReferences: number;
  }> {
    const session = this.driver.session();
    
    try {
      // Count FunctionalArea nodes (user data)
      const faCountResult = await session.run(
        'MATCH (fa:FunctionalArea) RETURN count(fa) as count'
      );
      const functionalAreaCount = faCountResult.records[0]?.get('count')?.low || 0;

      // Count Diagram nodes (user data)
      const diagramCountResult = await session.run(
        'MATCH (d:Diagram) RETURN count(d) as count'
      );
      const diagramCount = diagramCountResult.records[0]?.get('count')?.low || 0;

      // Check for any relationships between NodeTemplate and user data nodes
      const crossRefResult = await session.run(`
        MATCH (nt:NodeTemplate)-[r]-(other)
        WHERE NOT other:NodeTemplate
        RETURN count(r) as count
      `);
      const crossReferences = crossRefResult.records[0]?.get('count')?.low || 0;

      return {
        safe: crossReferences === 0,
        functionalAreaCount,
        diagramCount,
        crossReferences
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Remove all NodeTemplate nodes and their relationships
   */
  async cleanupNodeTemplates(): Promise<{
    deletedNodes: number;
    deletedRelationships: number;
  }> {
    const session = this.driver.session();
    
    try {
      // First, delete all relationships between NodeTemplate nodes
      const relDeleteResult = await session.run(`
        MATCH (nt1:NodeTemplate)-[r]-(nt2:NodeTemplate)
        DELETE r
        RETURN count(r) as deletedRelationships
      `);
      const deletedRelationships = relDeleteResult.records[0]?.get('deletedRelationships')?.low || 0;

      // Then, delete all NodeTemplate nodes
      const nodeDeleteResult = await session.run(`
        MATCH (nt:NodeTemplate)
        DELETE nt
        RETURN count(nt) as deletedNodes
      `);
      const deletedNodes = nodeDeleteResult.records[0]?.get('deletedNodes')?.low || 0;

      return { deletedNodes, deletedRelationships };
    } finally {
      await session.close();
    }
  }

  /**
   * Remove NodeTemplate constraint (optional - constraint will be ignored if not used)
   */
  async removeNodeTemplateConstraint(): Promise<boolean> {
    const session = this.driver.session();
    
    try {
      await session.run(
        'DROP CONSTRAINT unique_node_template_id IF EXISTS'
      );
      return true;
    } catch (error) {
      console.warn('Could not drop NodeTemplate constraint (may not exist):', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * Complete cleanup process with safety checks
   */
  async runCleanup(): Promise<void> {
    console.log('🔍 Starting NodeTemplate cleanup process...\n');

    // Get initial statistics
    const stats = await this.getCleanupStats();
    console.log('📊 Current NodeTemplate statistics:');
    console.log(`   - NodeTemplate nodes: ${stats.nodeTemplateCount}`);
    console.log(`   - Relationships: ${stats.relationshipCount}`);
    console.log(`   - Relationship types: ${stats.affectedRelationshipTypes.join(', ')}\n`);

    if (stats.nodeTemplateCount === 0) {
      console.log('✅ No NodeTemplate nodes found. Database is already clean.');
      return;
    }

    // Safety check
    const safety = await this.verifyUserDataSafety();
    console.log('🛡️ User data safety check:');
    console.log(`   - FunctionalArea nodes: ${safety.functionalAreaCount}`);
    console.log(`   - Diagram nodes: ${safety.diagramCount}`);
    console.log(`   - Cross-references to user data: ${safety.crossReferences}`);
    
    if (!safety.safe) {
      console.error('❌ SAFETY CHECK FAILED!');
      console.error(`Found ${safety.crossReferences} relationships between NodeTemplate and user data.`);
      console.error('Cleanup aborted to prevent data loss.');
      throw new Error('Unsafe to proceed with cleanup');
    }
    
    console.log('✅ Safety check passed. User data will not be affected.\n');

    // Perform cleanup
    console.log('🗑️ Removing NodeTemplate nodes and relationships...');
    const result = await this.cleanupNodeTemplates();
    
    console.log('✅ Cleanup completed:');
    console.log(`   - Deleted nodes: ${result.deletedNodes}`);
    console.log(`   - Deleted relationships: ${result.deletedRelationships}`);

    // Remove constraint
    console.log('🗑️ Removing NodeTemplate constraint...');
    const constraintRemoved = await this.removeNodeTemplateConstraint();
    console.log(constraintRemoved ? '✅ Constraint removed' : '⚠️ Constraint removal skipped');

    console.log('\n🎉 NodeTemplate cleanup completed successfully!');
    console.log('The database now uses static templates via StaticNodeTemplatesService.');
  }
}

// CLI execution support
if (require.main === module) {
  const cleanup = new NodeTemplateCleanup();
  cleanup.runCleanup()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}