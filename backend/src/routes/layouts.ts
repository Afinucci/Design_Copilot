import { Router } from 'express';
import Neo4jService from '../config/database';
import { Layout, LayoutData } from '../types';

const router = Router();

// Get all layouts
router.get('/', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();

  try {
    const result = await session.run(
      `MATCH (l:Layout)
       RETURN l.id as id, l.name as name, l.createdAt as createdAt, l.updatedAt as updatedAt,
              l.shapeCount as shapeCount
       ORDER BY l.updatedAt DESC`
    );

    const layouts = result.records.map(record => {
      const createdAt = record.get('createdAt');
      const updatedAt = record.get('updatedAt');

      return {
        id: record.get('id'),
        name: record.get('name'),
        createdAt: createdAt ? new Date(createdAt.toString()).toISOString() : null,
        updatedAt: updatedAt ? new Date(updatedAt.toString()).toISOString() : null,
        shapeCount: record.get('shapeCount') || 0
      };
    });

    console.log('🔍 Retrieved layouts:', layouts.map(l => ({ id: l.id, name: l.name, shapeCount: l.shapeCount })));

    res.json(layouts);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  } finally {
    await session.close();
  }
});

// Get layout by ID
router.get('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();

  try {
    const { id } = req.params;

    // Get layout
    const layoutResult = await session.run(
      'MATCH (l:Layout {id: $id}) RETURN l',
      { id }
    );

    if (layoutResult.records.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const layout = layoutResult.records[0].get('l').properties;

    // Parse the data field which contains the full LayoutData
    const layoutData: LayoutData = JSON.parse(layout.data);

    console.log('🔍 Retrieved layout:', { id: layout.id, name: layout.name, shapeCount: layoutData.shapes.length });

    const fullLayout: Layout = {
      id: layout.id,
      name: layout.name,
      data: layoutData,
      createdAt: layout.createdAt ? new Date(layout.createdAt.toString()).toISOString() : null,
      updatedAt: layout.updatedAt ? new Date(layout.updatedAt.toString()).toISOString() : null
    };

    res.json(fullLayout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  } finally {
    await session.close();
  }
});

// Create new layout
router.post('/', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();

  try {
    const layoutData: LayoutData = req.body;

    // Validate required fields
    if (!layoutData.name || !layoutData.shapes) {
      return res.status(400).json({ error: 'Layout name and shapes are required' });
    }

    // Debug: Log what we're saving
    console.log('🔍 Saving layout:', {
      name: layoutData.name,
      shapeCount: layoutData.shapes.length,
      connectionCount: layoutData.connections?.length || 0,
      doorConnectionCount: layoutData.doorConnections?.length || 0,
      doorPlacementCount: layoutData.doorPlacements?.length || 0
    });

    // Ensure metadata is set
    const now = new Date();
    if (!layoutData.metadata) {
      layoutData.metadata = {
        createdAt: now,
        modifiedAt: now,
        version: '1.0.0'
      };
    } else {
      layoutData.metadata.modifiedAt = now;
      if (!layoutData.metadata.createdAt) {
        layoutData.metadata.createdAt = now;
      }
      if (!layoutData.metadata.version) {
        layoutData.metadata.version = '1.0.0';
      }
    }

    // Generate ID if not provided
    if (!layoutData.id) {
      layoutData.id = `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    const result = await session.run(
      `CREATE (l:Layout {
        id: $id,
        name: $name,
        data: $data,
        shapeCount: $shapeCount,
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN l.id as id`,
      {
        id: layoutData.id,
        name: layoutData.name,
        data: JSON.stringify(layoutData),
        shapeCount: layoutData.shapes.length
      }
    );

    const layoutId = result.records[0].get('id');
    console.log('🔍 Layout saved successfully with ID:', layoutId);

    res.status(201).json({
      id: layoutId,
      message: 'Layout saved successfully',
      shapeCount: layoutData.shapes.length
    });
  } catch (error) {
    console.error('Error creating layout:', error);
    res.status(500).json({ error: 'Failed to create layout' });
  } finally {
    await session.close();
  }
});

// Update layout
router.put('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();

  try {
    const { id } = req.params;
    const layoutData: LayoutData = req.body;

    // Validate required fields
    if (!layoutData.name || !layoutData.shapes) {
      return res.status(400).json({ error: 'Layout name and shapes are required' });
    }

    // Update metadata
    const now = new Date();
    if (!layoutData.metadata) {
      layoutData.metadata = {
        createdAt: now,
        modifiedAt: now,
        version: '1.0.0'
      };
    } else {
      layoutData.metadata.modifiedAt = now;
    }

    console.log('🔍 Updating layout:', {
      id,
      name: layoutData.name,
      shapeCount: layoutData.shapes.length
    });

    const result = await session.run(
      `MATCH (l:Layout {id: $id})
       SET l.name = $name,
           l.data = $data,
           l.shapeCount = $shapeCount,
           l.updatedAt = datetime()
       RETURN l.id as id`,
      {
        id,
        name: layoutData.name,
        data: JSON.stringify(layoutData),
        shapeCount: layoutData.shapes.length
      }
    );

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    console.log('🔍 Layout updated successfully');

    res.json({
      id,
      message: 'Layout updated successfully',
      shapeCount: layoutData.shapes.length
    });
  } catch (error) {
    console.error('Error updating layout:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  } finally {
    await session.close();
  }
});

// Delete layout
router.delete('/:id', async (req, res) => {
  const session = Neo4jService.getInstance().getDriver().session();

  try {
    const { id } = req.params;

    const result = await session.run(
      `MATCH (l:Layout {id: $id})
       DELETE l
       RETURN COUNT(l) as deletedCount`,
      { id }
    );

    const deletedCountValue = result.records[0].get('deletedCount');
    const deletedCount = typeof deletedCountValue === 'number'
      ? deletedCountValue
      : (deletedCountValue && typeof deletedCountValue.toNumber === 'function'
        ? deletedCountValue.toNumber()
        : parseInt(deletedCountValue, 10) || 0);

    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    console.log('🔍 Layout deleted successfully:', id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  } finally {
    await session.close();
  }
});

export default router;
