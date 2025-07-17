import neo4j, { Driver } from 'neo4j-driver';
import { config } from 'dotenv';

config();

class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  private constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    const database = process.env.NEO4J_DATABASE || 'neo4j';

    console.log('Initializing Neo4j connection...');
    console.log('URI:', uri);
    console.log('User:', user);
    console.log('Database:', database);

    // Enhanced configuration for Neo4j Aura
    // Note: Encryption is handled by the URI scheme (neo4j+s://)
    const driverConfig: any = {
      maxConnectionPoolSize: 50,
      maxConnectionLifetime: 3600000,
      connectionAcquisitionTimeout: 60000,
      disableLosslessIntegers: true,
      // Add specific configuration for Aura
      ...(uri.includes('neo4j.io') && {
        maxTransactionRetryTime: 15000,
        connectionTimeout: 20000,
        maxConnectionLifetime: 1800000, // 30 minutes
        maxConnectionPoolSize: 10
      })
    };

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), driverConfig);
  }

  public static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  public getDriver(): Driver {
    return this.driver;
  }

  public async close(): Promise<void> {
    await this.driver.close();
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      console.log('Verifying Neo4j connectivity...');
      await this.driver.verifyConnectivity();
      console.log('✅ Neo4j connection verified successfully');
      
      // Test a simple query
      const session = this.driver.session();
      try {
        await session.run('RETURN 1 as test');
        console.log('✅ Neo4j query test successful');
        return true;
      } catch (queryError) {
        console.error('❌ Neo4j query test failed:', queryError);
        return false;
      } finally {
        await session.close();
      }
    } catch (error: any) {
      console.error('❌ Neo4j connection failed:', {
        name: error?.name || 'Unknown',
        code: error?.code || 'Unknown',
        message: error?.message || 'Unknown error'
      });
      return false;
    }
  }
}

export default Neo4jService;