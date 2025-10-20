/**
 * Utility functions for handling node name variations and ID parsing
 * Used across services for consistent node name resolution
 */

const nameMapping: { [key: string]: string[] } = {
  'weighing': ['Weighing', 'Weighing Room', 'Weighing Area'],
  'weighing-area': ['Weighing Area', 'Weighing Room', 'Weighing'],
  'weighing-room': ['Weighing Room', 'Weighing Area', 'Weighing'],
  'granulation': ['Granulation', 'Granulation Area', 'Granulation Room'],
  'compression': ['Compression', 'Compression Area', 'Compression Room', 'Tablet Compression'],
  'coating': ['Coating', 'Coating Area', 'Coating Room', 'Film Coating'],
  'packaging': ['Packaging', 'Packaging Area', 'Packaging Room', 'Primary Packaging'],
  // Enhanced analytical lab variations
  'analytical': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
  'analytical-lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
  'analytical_lab': ['Analytical Lab', 'Quality Control', 'Analytical Laboratory', 'Analytical Testing', 'QC Lab', 'Testing Lab'],
  'quality-control': ['Quality Control', 'Analytical Lab', 'QC Lab', 'Quality Assurance', 'QA Lab'],
  'qc-lab': ['QC Lab', 'Quality Control', 'Analytical Lab', 'Quality Control Lab'],
  'testing-lab': ['Testing Lab', 'Analytical Lab', 'Laboratory', 'Testing Laboratory'],
  'lab': ['Lab', 'Laboratory', 'Analytical Lab', 'Testing Lab'],
  'laboratory': ['Laboratory', 'Lab', 'Analytical Lab', 'Testing Laboratory'],
  'microbiology': ['Microbiology', 'Microbiology Lab', 'Micro Lab', 'Microbiology Laboratory'],
  'micro-lab': ['Micro Lab', 'Microbiology Lab', 'Microbiology', 'Microbiology Laboratory'],
  'raw-materials': ['Raw Materials', 'Raw Materials Storage', 'Raw Material Storage'],
  'finished-goods': ['Finished Goods', 'Finished Goods Storage', 'FG Storage'],
  'gowning': ['Gowning Area', 'Gowning Room', 'Personnel Gowning'],
  'gowning-area': ['Gowning Area', 'Gowning Room', 'Personnel Gowning']
};

/**
 * Extracts the base name from a node ID
 * Handles various ID formats with prefixes and suffixes
 */
function extractBaseName(nodeId: string): string {
  const patterns = [
    /^node-node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,  // node-node-coating-123-456 (double prefix)
    /^node-([a-zA-Z]+(?:-[a-zA-Z]+)*?)(?:-\d+)+$/,       // node-coating-123 (single prefix)
    /^([a-zA-Z]+(?:-[a-zA-Z]+)*)(?:-\d+)*$/,             // coating or coating-123 (no prefix)
  ];

  for (const pattern of patterns) {
    const match = nodeId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return nodeId;
}

/**
 * Returns all possible name variations for a given node ID
 * Used for fuzzy matching in Neo4j queries
 */
export function getNodeNameVariations(nodeId: string): string[] {
  const baseName = extractBaseName(nodeId);

  const variations = nameMapping[baseName];
  if (variations) {
    return variations;
  }

  // Fallback: return title case version
  const titleCase = baseName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return [titleCase, baseName];
}

/**
 * Gets the primary (most common) name for a given node ID
 * Used as the main display name
 */
export function getTriggerNodeName(nodeId: string): string {
  const extractedName = extractBaseName(nodeId);

  // Validate extracted name
  if (extractedName.length < 2 || !/^[a-zA-Z-]+$/.test(extractedName)) {
    console.warn('⚠️ Invalid extracted name format:', extractedName);
    return nodeId;
  }

  // Return the first variation as the primary name
  const variations = nameMapping[extractedName];
  if (variations && variations.length > 0) {
    return variations[0];
  }

  // Fallback: convert hyphenated to title case
  const titleCase = extractedName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return titleCase;
}
