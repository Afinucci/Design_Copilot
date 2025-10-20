import Neo4jService from '../config/database';
import { getNodeNameVariations } from '../utils/nodeNameUtils';

export interface Neo4jDebugInfo {
  connectionStatus: 'connected' | 'disconnected' | 'error';
  templateCount: number;
  functionalAreaCount: number;
  relationshipCount: number;
  availableTemplates: string[];
  recentErrors: string[];
  performanceMetrics: {
    averageQueryTime: number;
    slowQueries: Array<{ query: string; executionTime: number; timestamp: string }>;
  };
}

export interface TemplateSearchResult {
  found: boolean;
  template?: any;
  matchedBy?: string;
  searchedVariations: string[];
  availableTemplates: string[];
  suggestions: string[];
}

export class Neo4jDebugService {
  private neo4jService: Neo4jService;
  private queryMetrics: Array<{ query: string; executionTime: number; timestamp: string }> = [];
  private recentErrors: string[] = [];

  constructor() {
    this.neo4jService = Neo4jService.getInstance();
  }

  /**
   * Get comprehensive debug information about Neo4j state
   */
  async getDebugInfo(): Promise<Neo4jDebugInfo> {
    const session = this.neo4jService.getDriver().session();
    
    try {
      console.log('🔧 Debug: Gathering Neo4j debug information...');
      
      // Test connection
      let connectionStatus: 'connected' | 'disconnected' | 'error';
      try {
        await this.neo4jService.verifyConnection();
        connectionStatus = 'connected';
      } catch (error) {
        connectionStatus = 'error';
        this.logError(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Get counts
      const countsQuery = `
        OPTIONAL MATCH (nt:NodeTemplate)
        WITH count(nt) as templateCount
        OPTIONAL MATCH (fa:FunctionalArea)
        WITH templateCount, count(fa) as functionalAreaCount
        OPTIONAL MATCH ()-[r]-()
        RETURN templateCount, functionalAreaCount, count(r) as relationshipCount
      `;
      
      const countsResult = await this.trackQuery(session, countsQuery, {});
      const counts = countsResult.records[0];
      
      // Get available templates
      const templatesQuery = `
        MATCH (nt:NodeTemplate)
        RETURN nt.name as name, nt.id as id, nt.category as category
        ORDER BY nt.category, nt.name
      `;
      
      const templatesResult = await this.trackQuery(session, templatesQuery, {});
      const availableTemplates = templatesResult.records.map((record: any) => 
        `${record.get('name')} (${record.get('category')}, ID: ${record.get('id')})`
      );

      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics();

      const debugInfo: Neo4jDebugInfo = {
        connectionStatus,
        templateCount: counts.get('templateCount').toNumber(),
        functionalAreaCount: counts.get('functionalAreaCount').toNumber(),
        relationshipCount: counts.get('relationshipCount').toNumber(),
        availableTemplates,
        recentErrors: [...this.recentErrors],
        performanceMetrics
      };

      console.log('🔧 Debug: Neo4j debug info compiled:', {
        connectionStatus: debugInfo.connectionStatus,
        templateCount: debugInfo.templateCount,
        functionalAreaCount: debugInfo.functionalAreaCount,
        relationshipCount: debugInfo.relationshipCount,
        availableTemplatesCount: debugInfo.availableTemplates.length
      });

      return debugInfo;
    } catch (error) {
      const errorMessage = `Failed to gather debug info: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logError(errorMessage);
      
      return {
        connectionStatus: 'error',
        templateCount: 0,
        functionalAreaCount: 0,
        relationshipCount: 0,
        availableTemplates: [],
        recentErrors: [...this.recentErrors],
        performanceMetrics: {
          averageQueryTime: 0,
          slowQueries: []
        }
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Debug template search with comprehensive analysis
   */
  async debugTemplateSearch(templateId: string, templateName: string): Promise<TemplateSearchResult> {
    const session = this.neo4jService.getDriver().session();
    
    try {
      console.log('🔍 Debug: Starting comprehensive template search analysis:', { templateId, templateName });
      
      const searchedVariations: string[] = [];
      let found = false;
      let template: any = null;
      let matchedBy: string = '';

      // Get all available templates for reference
      const allTemplatesQuery = `MATCH (nt:NodeTemplate) RETURN nt.name as name, nt.id as id ORDER BY name`;
      const allTemplatesResult = await this.trackQuery(session, allTemplatesQuery, {});
      const availableTemplates = allTemplatesResult.records.map((record: any) => 
        `${record.get('name')} (ID: ${record.get('id')})`
      );

      // Strategy 1: Direct ID lookup
      if (templateId) {
        try {
          const idQuery = `MATCH (nt:NodeTemplate {id: $templateId}) RETURN nt`;
          const idResult = await this.trackQuery(session, idQuery, { templateId });
          searchedVariations.push(`Direct ID: ${templateId}`);
          
          if (idResult.records.length > 0) {
            found = true;
            template = idResult.records[0].get('nt').properties;
            matchedBy = 'direct_id';
            console.log('🎯 Debug: Found by direct ID lookup');
          }
        } catch (error) {
          console.warn('⚠️ Debug: Direct ID lookup failed:', error);
        }
      }

      // Strategy 2: Direct name lookup (case-insensitive)
      if (!found && templateName) {
        try {
          const nameQuery = `MATCH (nt:NodeTemplate) WHERE toLower(nt.name) = toLower($templateName) RETURN nt`;
          const nameResult = await this.trackQuery(session, nameQuery, { templateName });
          searchedVariations.push(`Direct name: ${templateName}`);
          
          if (nameResult.records.length > 0) {
            found = true;
            template = nameResult.records[0].get('nt').properties;
            matchedBy = 'direct_name';
            console.log('🎯 Debug: Found by direct name lookup');
          }
        } catch (error) {
          console.warn('⚠️ Debug: Direct name lookup failed:', error);
        }
      }

      // Strategy 3: Name variations lookup
      if (!found && templateName) {
        const nameVariations = getNodeNameVariations(templateName);
        console.log('🔄 Debug: Trying name variations:', nameVariations);
        
        for (const variation of nameVariations) {
          try {
            const variationQuery = `MATCH (nt:NodeTemplate) WHERE toLower(nt.name) = toLower($variation) RETURN nt`;
            const variationResult = await this.trackQuery(session, variationQuery, { variation });
            searchedVariations.push(`Variation: ${variation}`);
            
            if (variationResult.records.length > 0) {
              found = true;
              template = variationResult.records[0].get('nt').properties;
              matchedBy = `variation_${variation}`;
              console.log(`🎯 Debug: Found by name variation: ${variation}`);
              break;
            }
          } catch (error) {
            console.warn(`⚠️ Debug: Variation lookup failed for ${variation}:`, error);
          }
        }
      }

      // Strategy 4: Partial matching
      if (!found && templateName) {
        try {
          const partialQuery = `
            MATCH (nt:NodeTemplate) 
            WHERE toLower(nt.name) CONTAINS toLower($templateName)
               OR toLower($templateName) CONTAINS toLower(nt.name)
            RETURN nt, 
                   CASE 
                     WHEN toLower(nt.name) = toLower($templateName) THEN 3
                     WHEN toLower(nt.name) CONTAINS toLower($templateName) THEN 2
                     ELSE 1
                   END as score
            ORDER BY score DESC
            LIMIT 3
          `;
          const partialResult = await this.trackQuery(session, partialQuery, { templateName });
          searchedVariations.push(`Partial match: ${templateName}`);
          
          if (partialResult.records.length > 0) {
            found = true;
            template = partialResult.records[0].get('nt').properties;
            matchedBy = 'partial_match';
            console.log('🎯 Debug: Found by partial matching');
          }
        } catch (error) {
          console.warn('⚠️ Debug: Partial matching failed:', error);
        }
      }

      // Generate suggestions for better matches
      const suggestions = this.generateSearchSuggestions(templateName, availableTemplates, found);

      const result: TemplateSearchResult = {
        found,
        template,
        matchedBy,
        searchedVariations,
        availableTemplates,
        suggestions
      };

      console.log('🔍 Debug: Template search analysis complete:', {
        found: result.found,
        matchedBy: result.matchedBy,
        searchedVariations: result.searchedVariations.length,
        availableTemplates: result.availableTemplates.length,
        suggestions: result.suggestions.length
      });

      return result;
    } catch (error) {
      const errorMessage = `Template search debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logError(errorMessage);
      
      return {
        found: false,
        searchedVariations: [`Error: ${errorMessage}`],
        availableTemplates: [],
        suggestions: ['Fix database connection', 'Check Neo4j service status', 'Verify template initialization']
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Test constraint queries for a specific node template
   */
  async debugConstraintQueries(templateId: string, templateName: string): Promise<{
    constraintsFound: number;
    constraintTypes: string[];
    queryResults: any[];
    executionTime: number;
    errors: string[];
  }> {
    const session = this.neo4jService.getDriver().session();
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      console.log('🔧 Debug: Testing constraint queries for template:', { templateId, templateName });
      
      const constraintsQuery = `
        MATCH (source:NodeTemplate)-[r]-(target:NodeTemplate)
        WHERE source.id = $templateId OR toLower(source.name) = toLower($templateName)
        RETURN 
          source.name as sourceName,
          source.id as sourceId,
          r,
          type(r) as relType,
          target.name as targetName,
          target.id as targetId,
          r.priority as priority,
          r.reason as reason,
          CASE 
            WHEN startNode(r).id = source.id THEN 'outgoing'
            ELSE 'incoming'
          END as direction
        ORDER BY COALESCE(r.priority, 5) DESC, type(r), target.name
      `;

      const result = await this.trackQuery(session, constraintsQuery, { templateId, templateName });
      const executionTime = Date.now() - startTime;
      
      const queryResults = result.records.map((record: any) => ({
        sourceName: record.get('sourceName'),
        sourceId: record.get('sourceId'),
        targetName: record.get('targetName'),
        targetId: record.get('targetId'),
        relationshipType: record.get('relType'),
        priority: record.get('priority'),
        reason: record.get('reason'),
        direction: record.get('direction'),
        relationshipProperties: record.get('r').properties
      }));

      const constraintTypes: string[] = [...new Set(queryResults.map((r: any) => r.relationshipType))] as string[];

      console.log('🔧 Debug: Constraint query results:', {
        constraintsFound: queryResults.length,
        constraintTypes,
        executionTime: `${executionTime}ms`
      });

      return {
        constraintsFound: queryResults.length,
        constraintTypes,
        queryResults,
        executionTime,
        errors
      };
    } catch (error) {
      const errorMessage = `Constraint query debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logError(errorMessage);
      errors.push(errorMessage);
      
      return {
        constraintsFound: 0,
        constraintTypes: [],
        queryResults: [],
        executionTime: Date.now() - startTime,
        errors
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Track query execution time and log slow queries
   */
  private async trackQuery(session: any, query: string, params: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await session.run(query, params);
      const executionTime = Date.now() - startTime;
      
      // Track metrics
      this.queryMetrics.push({
        query: query.slice(0, 100) + (query.length > 100 ? '...' : ''),
        executionTime,
        timestamp: new Date().toISOString()
      });
      
      // Keep only recent metrics (last 50 queries)
      if (this.queryMetrics.length > 50) {
        this.queryMetrics = this.queryMetrics.slice(-50);
      }
      
      // Log slow queries
      if (executionTime > 1000) {
        console.warn(`🐌 Slow Neo4j query detected: ${executionTime}ms`, {
          query: query.slice(0, 200),
          params
        });
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = `Query failed after ${executionTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.logError(errorMessage);
      throw error;
    }
  }

  /**
   * Log errors with rotation
   */
  private logError(error: string): void {
    this.recentErrors.push(`${new Date().toISOString()}: ${error}`);
    
    // Keep only recent errors (last 20)
    if (this.recentErrors.length > 20) {
      this.recentErrors = this.recentErrors.slice(-20);
    }
    
    console.error('🔴 Neo4j Debug Error:', error);
  }

  /**
   * Calculate performance metrics from tracked queries
   */
  private calculatePerformanceMetrics(): Neo4jDebugInfo['performanceMetrics'] {
    if (this.queryMetrics.length === 0) {
      return {
        averageQueryTime: 0,
        slowQueries: []
      };
    }

    const totalTime = this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    const averageQueryTime = Math.round(totalTime / this.queryMetrics.length);
    
    const slowQueries = this.queryMetrics
      .filter(metric => metric.executionTime > 500)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    return {
      averageQueryTime,
      slowQueries
    };
  }

  /**
   * Generate helpful suggestions for template searches
   */
  private generateSearchSuggestions(templateName: string, availableTemplates: string[], found: boolean): string[] {
    const suggestions: string[] = [];
    
    if (!found) {
      suggestions.push('Template not found in database');
      
      if (templateName) {
        // Find similar template names
        const similarTemplates = availableTemplates.filter(template => 
          template.toLowerCase().includes(templateName.toLowerCase()) ||
          templateName.toLowerCase().includes(template.toLowerCase())
        );
        
        if (similarTemplates.length > 0) {
          suggestions.push(`Similar templates found: ${similarTemplates.slice(0, 3).join(', ')}`);
        }
        
        // Suggest using name variations
        const variations = getNodeNameVariations(templateName);
        if (variations.length > 1) {
          suggestions.push(`Try these variations: ${variations.slice(0, 3).join(', ')}`);
        }
      }
      
      suggestions.push('Initialize templates using POST /api/nodes/initialize');
      suggestions.push('Check Neo4j connection and database status');
    } else {
      suggestions.push('Template found successfully');
      suggestions.push('Check constraint relationships for this template');
    }
    
    return suggestions;
  }

  /**
   * Clear performance metrics and error logs
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.recentErrors = [];
    console.log('🧹 Debug: Metrics and error logs cleared');
  }
}