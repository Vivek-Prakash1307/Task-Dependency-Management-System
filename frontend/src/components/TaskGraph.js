import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTask } from '../contexts/TaskContext';

const TaskGraph = ({ globalSearch = '' }) => {
  const { graphData, loadGraphData, loading } = useTask();
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [performanceMode, setPerformanceMode] = useState(false);
  
  // New state for drag-and-drop functionality
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);
  const [nodePositions, setNodePositions] = useState(new Map());
  const [useCustomLayout, setUseCustomLayout] = useState(false);

  // Performance thresholds
  const PERFORMANCE_THRESHOLD = 25; // Switch to performance mode above this many nodes
  const MAX_NODES_WARNING = 50; // Show warning above this many nodes

  // Node and edge styling constants
  const NODE_RADIUS = 30;
  const EDGE_COLOR = '#4b5563'; // Even darker gray for better arrow visibility
  const SELECTED_COLOR = '#f59e0b';
  
  // Memoize node colors to prevent unnecessary re-renders
  const NODE_COLORS = React.useMemo(() => ({
    pending: '#6b7280',
    in_progress: '#3b82f6',
    completed: '#10b981',
    blocked: '#ef4444',
  }), []);

  // Priority colors for visual indicators
  const PRIORITY_COLORS = React.useMemo(() => ({
    1: '#3b82f6', // Blue - Low
    2: '#10b981', // Green - Medium-Low  
    3: '#f59e0b', // Yellow - Medium
    4: '#f97316', // Orange - Medium-High
    5: '#ef4444', // Red - High
  }), []);

  // Export graph as PNG
  const exportAsPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the original canvas content on top
    tempCtx.drawImage(canvas, 0, 0);

    // Add title and metadata
    tempCtx.fillStyle = '#1f2937';
    tempCtx.font = 'bold 24px Arial';
    tempCtx.textAlign = 'center';
    tempCtx.fillText('Task Dependency Graph', tempCanvas.width / 2, 30);

    tempCtx.font = '14px Arial';
    tempCtx.fillText(
      `${graphData.nodes.length} tasks, ${graphData.edges.length} dependencies - Generated on ${new Date().toLocaleDateString()}`,
      tempCanvas.width / 2,
      50
    );

    // Create download link
    const link = document.createElement('a');
    link.download = `task-dependency-graph-${new Date().toISOString().split('T')[0]}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }, [graphData.nodes.length, graphData.edges.length]);

  // Get priority label
  const getPriorityLabel = useCallback((priority) => {
    const labels = {
      1: 'Low',
      2: 'Medium-Low',
      3: 'Medium',
      4: 'Medium-High',
      5: 'High'
    };
    return labels[priority] || 'Medium';
  }, []);

  // Load graph data on mount and check performance mode
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Calculate search matches
  const searchMatchedNodes = React.useMemo(() => {
    if (!globalSearch.trim()) return [];
    const query = globalSearch.toLowerCase().trim();
    return graphData.nodes.filter(node => 
      node.title.toLowerCase().includes(query) ||
      node.description.toLowerCase().includes(query)
    );
  }, [graphData.nodes, globalSearch]);

  const searchMatchedNodeIds = React.useMemo(() => 
    searchMatchedNodes.map(node => node.id), 
    [searchMatchedNodes]
  );

  // Auto-enable performance mode for large graphs
  useEffect(() => {
    if (graphData.nodes.length > PERFORMANCE_THRESHOLD) {
      setPerformanceMode(true);
    } else {
      setPerformanceMode(false);
    }
  }, [graphData.nodes.length, PERFORMANCE_THRESHOLD]);

  // Helper function to draw an arrow between two points
  const drawArrow = useCallback((ctx, fromX, fromY, toX, toY, isHighlighted = false) => {
    const arrowLength = isHighlighted ? 20 : 16; // Slightly larger arrows
    const arrowWidth = isHighlighted ? 9 : 7;   // Wider arrows for better visibility
    
    // Calculate direction
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Draw main line with increased thickness
    ctx.lineWidth = isHighlighted ? 3 : 2.5; // Thicker lines for better visibility
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    
    // Calculate arrowhead position
    const arrowBaseX = toX - arrowLength * 0.8 * unitX; // Slightly longer base
    const arrowBaseY = toY - arrowLength * 0.8 * unitY;
    
    // Calculate perpendicular vector for arrowhead width
    const perpX = -unitY;
    const perpY = unitX;
    
    // Draw filled triangular arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY); // Arrow tip
    ctx.lineTo(
      arrowBaseX + perpX * arrowWidth,
      arrowBaseY + perpY * arrowWidth
    );
    ctx.lineTo(
      arrowBaseX - perpX * arrowWidth,
      arrowBaseY - perpY * arrowWidth
    );
    ctx.closePath();
    ctx.fill();
    
    // Add stroke to arrowhead for better definition
    ctx.lineWidth = isHighlighted ? 2 : 1.5;
    ctx.stroke();
  }, []);

  // Calculate layout positions for nodes
  const calculateLayout = useCallback((nodes, edges) => {
    if (nodes.length === 0) return [];

    // If using custom layout and we have stored positions, use them
    if (useCustomLayout && nodePositions.size > 0) {
      return nodes.map(node => {
        const customPos = nodePositions.get(node.id);
        return {
          ...node,
          x: customPos ? customPos.x : 100 + Math.random() * (canvasSize.width - 200),
          y: customPos ? customPos.y : 100 + Math.random() * (canvasSize.height - 200),
          level: 0
        };
      });
    }

    // Default hierarchical layout algorithm
    const adjacencyList = new Map();
    const inDegree = new Map();

    // Initialize adjacency list and in-degree count
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build adjacency list and calculate in-degrees
    edges.forEach(edge => {
      adjacencyList.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    });

    // Topological sort to determine levels
    const queue = [];
    const levels = new Map();

    // Start with nodes that have no dependencies
    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
        levels.set(node.id, 0);
      }
    });

    while (queue.length > 0) {
      const nodeId = queue.shift();
      const currentLevel = levels.get(nodeId);

      adjacencyList.get(nodeId).forEach(neighborId => {
        const newInDegree = inDegree.get(neighborId) - 1;
        inDegree.set(neighborId, newInDegree);

        if (newInDegree === 0) {
          queue.push(neighborId);
          levels.set(neighborId, currentLevel + 1);
        }
      });
    }

    // Group nodes by level
    const levelGroups = new Map();
    nodes.forEach(node => {
      const level = levels.get(node.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level).push(node);
    });

    // Calculate positions
    const levelHeight = 120;
    const nodeSpacing = 100;
    const layoutNodes = [];

    levelGroups.forEach((levelNodes, level) => {
      const y = 50 + level * levelHeight;
      const totalWidth = (levelNodes.length - 1) * nodeSpacing;
      const startX = (canvasSize.width - totalWidth) / 2;

      levelNodes.forEach((node, index) => {
        const calculatedX = startX + index * nodeSpacing;
        const calculatedY = y;
        
        // Store initial positions if not in custom mode
        if (!useCustomLayout && !nodePositions.has(node.id)) {
          setNodePositions(prev => new Map(prev.set(node.id, { x: calculatedX, y: calculatedY })));
        }
        
        layoutNodes.push({
          ...node,
          x: calculatedX,
          y: calculatedY,
          level: level
        });
      });
    });

    return layoutNodes;
  }, [canvasSize.width, canvasSize.height, useCustomLayout, nodePositions]);

  // Draw the graph on canvas with performance optimizations
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvasSize;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const layoutNodes = calculateLayout(graphData.nodes, graphData.edges);

    // Performance optimization: Skip detailed rendering when zoomed out
    const shouldSkipDetails = performanceMode && zoom < 0.5;

    // Get highlighted edges if a node is selected
    const highlightedEdges = selectedNode ? graphData.edges.filter(edge => 
      edge.source === selectedNode.id || edge.target === selectedNode.id
    ) : [];

    // Draw edges first (so they appear behind nodes)
    if (!shouldSkipDetails || selectedNode) {
      graphData.edges.forEach(edge => {
        const sourceNode = layoutNodes.find(n => n.id === edge.source);
        const targetNode = layoutNodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const isHighlighted = highlightedEdges.some(e => e.id === edge.id);
          
          // Skip non-highlighted edges in performance mode when something is selected
          if (performanceMode && selectedNode && !isHighlighted) return;
          
          // Set edge style with enhanced visibility
          ctx.strokeStyle = isHighlighted ? SELECTED_COLOR : EDGE_COLOR;
          ctx.fillStyle = isHighlighted ? SELECTED_COLOR : EDGE_COLOR;
          ctx.lineWidth = isHighlighted ? 3 : (shouldSkipDetails ? 1.5 : 2.5);
          
          // Calculate edge endpoints (from edge of circles, not centers)
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance === 0) return; // Skip if nodes are at same position
          
          // Normalize direction vector
          const unitX = dx / distance;
          const unitY = dy / distance;
          
          // Calculate start and end points on circle edges
          const startX = sourceNode.x + NODE_RADIUS * unitX;
          const startY = sourceNode.y + NODE_RADIUS * unitY;
          const endX = targetNode.x - (NODE_RADIUS + 8) * unitX; // More space for larger arrows
          const endY = targetNode.y - (NODE_RADIUS + 8) * unitY;
          
          // Draw arrow using helper function
          if (!shouldSkipDetails) {
            drawArrow(ctx, startX, startY, endX, endY, isHighlighted);
          } else {
            // Simple line for performance mode
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
      });
    }

    // Get highlighted nodes (selected node and its dependencies/dependents)
    const highlightedNodeIds = selectedNode ? [
      selectedNode.id,
      ...graphData.edges.filter(e => e.source === selectedNode.id).map(e => e.target),
      ...graphData.edges.filter(e => e.target === selectedNode.id).map(e => e.source)
    ] : [];

    // Get search-matched nodes (use pre-calculated)
    // searchMatchedNodeIds is already available from the component scope

    // Draw nodes
    layoutNodes.forEach(node => {
      const isSelected = selectedNode && selectedNode.id === node.id;
      const isHighlighted = highlightedNodeIds.includes(node.id);
      const isSearchMatched = searchMatchedNodeIds.includes(node.id);
      const isBeingDragged = isDraggingNode && draggedNode && draggedNode.id === node.id;
      
      // In performance mode, only draw selected/highlighted nodes when something is selected
      if (performanceMode && selectedNode && !isSelected && !isHighlighted && !isSearchMatched) return;
      
      // Adjust node size based on zoom and performance mode
      const nodeRadius = shouldSkipDetails ? NODE_RADIUS * 0.7 : NODE_RADIUS;
      
      // Draw node circle with drag feedback
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      
      if (isBeingDragged) {
        // Special styling for dragged nodes
        ctx.fillStyle = '#8b5cf6'; // Purple color for dragged nodes
      } else if (isSelected) {
        ctx.fillStyle = SELECTED_COLOR;
      } else if (isSearchMatched) {
        // Special styling for search matches
        ctx.fillStyle = '#10b981'; // Green color for search matches
      } else if (isHighlighted) {
        // Brighten the color for highlighted nodes
        const baseColor = NODE_COLORS[node.status];
        ctx.fillStyle = baseColor;
      } else if ((selectedNode && !isHighlighted) || (globalSearch && !isSearchMatched)) {
        // Dim non-highlighted/non-matched nodes when something is selected/searched
        ctx.fillStyle = '#d1d5db'; // Light gray
      } else {
        ctx.fillStyle = NODE_COLORS[node.status];
      }
      
      ctx.fill();
      
      // Draw node border with drag feedback
      if (isBeingDragged) {
        ctx.strokeStyle = '#7c3aed'; // Darker purple border for dragged nodes
        ctx.lineWidth = 4;
      } else if (isSearchMatched) {
        ctx.strokeStyle = '#059669'; // Darker green border for search matches
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = isSelected ? '#d97706' : isHighlighted ? '#374151' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : isHighlighted ? 2 : 2;
      }
      ctx.stroke();

      // Draw drag indicator (small circle) for dragged nodes
      if (isBeingDragged) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }

      // Draw search match indicator (pulsing ring) for search matches
      if (isSearchMatched && !isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]); // Dashed line
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }

      // Draw priority indicator (small circle in top-right)
      if (!shouldSkipDetails && node.priority) {
        const priorityRadius = 8;
        const priorityX = node.x + nodeRadius - 5;
        const priorityY = node.y - nodeRadius + 5;
        
        // Ensure priority is a number and handle null/undefined values
        let numPriority;
        if (node.priority === null || node.priority === undefined) {
          numPriority = 3; // Default to medium priority
        } else {
          numPriority = typeof node.priority === 'string' ? parseInt(node.priority, 10) : node.priority;
          // Ensure it's a valid number between 1-5
          if (isNaN(numPriority) || numPriority < 1 || numPriority > 5) {
            numPriority = 3; // Default to medium priority
          }
        }
        
        ctx.beginPath();
        ctx.arc(priorityX, priorityY, priorityRadius, 0, 2 * Math.PI);
        ctx.fillStyle = PRIORITY_COLORS[numPriority] || PRIORITY_COLORS[3];
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw priority number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numPriority.toString(), priorityX, priorityY);
      }

      // Draw estimated hours indicator (small text below node)
      if (!shouldSkipDetails && node.estimated_hours) {
        const estimatedHours = node.estimated_hours || 0;
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${estimatedHours}h`, node.x, node.y + nodeRadius + 5);
      }

      // Draw node text (skip in performance mode when zoomed out)
      if (!shouldSkipDetails) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Truncate long titles
        let displayText = node.title;
        if (displayText.length > 8) {
          displayText = displayText.substring(0, 8) + '...';
        }
        
        ctx.fillText(displayText, node.x, node.y);
      }
    });

    ctx.restore();
  }, [graphData, canvasSize, zoom, pan, selectedNode, calculateLayout, NODE_COLORS, EDGE_COLOR, SELECTED_COLOR, performanceMode, drawArrow, isDraggingNode, draggedNode, globalSearch, searchMatchedNodeIds, PRIORITY_COLORS]);

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        setCanvasSize({
          width: Math.max(800, rect.width - 32), // 32px for padding
          height: 600
        });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Draw graph when data or canvas changes
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Get node at position
  const getNodeAtPosition = (x, y) => {
    const layoutNodes = calculateLayout(graphData.nodes, graphData.edges);
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to canvas coordinates
    const canvasX = (x - canvasRect.left - pan.x) / zoom;
    const canvasY = (y - canvasRect.top - pan.y) / zoom;

    return layoutNodes.find(node => {
      const distance = Math.sqrt(
        Math.pow(canvasX - node.x, 2) + Math.pow(canvasY - node.y, 2)
      );
      return distance <= NODE_RADIUS;
    });
  };

  // Handle mouse events with drag-and-drop support
  const handleMouseDown = (e) => {
    const node = getNodeAtPosition(e.clientX, e.clientY);
    
    if (node) {
      // Check if Alt key is pressed for dragging, otherwise select
      if (e.altKey) {
        setIsDraggingNode(true);
        setDraggedNode(node);
        setUseCustomLayout(true);
        // Store the offset from mouse to node center
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
        const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
        setDragStart({ 
          x: canvasX - node.x, 
          y: canvasY - node.y 
        });
      } else {
        setSelectedNode(node);
      }
    } else {
      // Start panning if not clicking on a node
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedNode(null);
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingNode && draggedNode) {
      // Handle node dragging
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const canvasY = (e.clientY - canvasRect.top - pan.y) / zoom;
      
      // Calculate new position accounting for the drag offset
      const newX = canvasX - dragStart.x;
      const newY = canvasY - dragStart.y;
      
      // Constrain to canvas bounds
      const constrainedX = Math.max(NODE_RADIUS, Math.min(canvasSize.width - NODE_RADIUS, newX));
      const constrainedY = Math.max(NODE_RADIUS, Math.min(canvasSize.height - NODE_RADIUS, newY));
      
      // Update node position
      setNodePositions(prev => new Map(prev.set(draggedNode.id, { 
        x: constrainedX, 
        y: constrainedY 
      })));
      
      // Clear tooltip while dragging
      setTooltip(null);
    } else if (isDragging) {
      // Handle canvas panning
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // Show tooltip for hovered nodes
      const node = getNodeAtPosition(e.clientX, e.clientY);
      if (node && !isDraggingNode) {
        setTooltip({
          x: e.clientX,
          y: e.clientY,
          node: node
        });
      } else {
        setTooltip(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingNode(false);
    setDraggedNode(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * zoomFactor));
    setZoom(newZoom);
  };

  // Reset view and layout functions
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const resetLayout = () => {
    setUseCustomLayout(false);
    setNodePositions(new Map());
    setSelectedNode(null);
  };

  const toggleLayoutMode = () => {
    setUseCustomLayout(!useCustomLayout);
    if (useCustomLayout) {
      // Switching back to automatic layout
      setNodePositions(new Map());
    }
  };

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Dependency Graph</h3>
          <div className="text-sm text-gray-600">
            {graphData.nodes.length} tasks, {graphData.edges.length} dependencies
          </div>
          {useCustomLayout && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Custom Layout Mode
            </div>
          )}
          {graphData.nodes.length > PERFORMANCE_THRESHOLD && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Performance mode enabled
            </div>
          )}
          {graphData.nodes.length > MAX_NODES_WARNING && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              Large graph detected - performance may be affected
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(zoom * 1.2)}
            className="btn-secondary text-sm py-1 px-2"
            title="Zoom In"
          >
            🔍+
          </button>
          <button
            onClick={() => setZoom(zoom * 0.8)}
            className="btn-secondary text-sm py-1 px-2"
            title="Zoom Out"
          >
            🔍-
          </button>
          <button
            onClick={resetView}
            className="btn-secondary text-sm py-1 px-2"
            title="Reset View"
          >
            🎯 Reset
          </button>
          <button
            onClick={toggleLayoutMode}
            className={`text-sm py-1 px-2 ${useCustomLayout ? 'btn-primary' : 'btn-secondary'}`}
            title="Toggle between automatic and custom layout"
          >
            📐 {useCustomLayout ? 'Auto Layout' : 'Custom Layout'}
          </button>
          {useCustomLayout && (
            <button
              onClick={resetLayout}
              className="btn-secondary text-sm py-1 px-2"
              title="Reset to automatic layout"
            >
              🔄 Reset Layout
            </button>
          )}
          <button
            onClick={() => setPerformanceMode(!performanceMode)}
            className={`text-sm py-1 px-2 ${performanceMode ? 'btn-primary' : 'btn-secondary'}`}
            title="Toggle Performance Mode"
          >
            ⚡ Performance
          </button>
          <button
            onClick={exportAsPNG}
            className="btn-secondary text-sm py-1 px-2"
            title="Export graph as PNG image"
          >
            📷 Export PNG
          </button>
          <button
            onClick={loadGraphData}
            className="btn-primary text-sm py-1 px-2 flex items-center space-x-1"
            title="Refresh Graph"
            disabled={loading}
          >
            {loading && <div className="spinner-sm"></div>}
            <span>🔄 Refresh</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-6 mb-4 text-sm flex-wrap">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-gray-500"></div>
          <span>Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>Blocked</span>
        </div>
        {globalSearch && searchMatchedNodeIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
            <span>Search Match ({searchMatchedNodeIds.length})</span>
          </div>
        )}
      </div>

      {/* Canvas Container */}
      <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`graph-canvas ${isDraggingNode ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="tooltip"
            style={{
              left: tooltip.x + 10,
              top: tooltip.y - 10
            }}
          >
            <div className="font-medium">{tooltip.node.title}</div>
            <div className="text-xs opacity-75 space-y-1">
              <div>Status: {tooltip.node.status.replace('_', ' ')}</div>
              <div>Priority: {tooltip.node.priority || 3}/5 ({getPriorityLabel(tooltip.node.priority || 3)})</div>
              <div>Estimated: {tooltip.node.estimated_hours || 0}h</div>
            </div>
          </div>
        )}

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm">
            <h4 className="font-medium text-gray-900 mb-2">{selectedNode.title}</h4>
            <div className="text-sm text-gray-600 mb-3 space-y-1">
              <p>Status: <span className="capitalize font-medium">{selectedNode.status.replace('_', ' ')}</span></p>
              <p>Priority: <span className="font-medium" style={{color: PRIORITY_COLORS[typeof selectedNode.priority === 'string' ? parseInt(selectedNode.priority, 10) : (selectedNode.priority || 3)]}}>
                {selectedNode.priority || 3}/5 ({getPriorityLabel(selectedNode.priority || 3)})
              </span></p>
              <p>Estimated: <span className="font-medium">{selectedNode.estimated_hours || 0}h</span></p>
            </div>
            
            {/* Dependencies Info */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium text-gray-700">Dependencies:</span>
                <span className="ml-1 text-gray-600">
                  {graphData.edges.filter(e => e.target === selectedNode.id).length} tasks
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Dependents:</span>
                <span className="ml-1 text-gray-600">
                  {graphData.edges.filter(e => e.source === selectedNode.id).length} tasks
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Close
            </button>
          </div>
        )}

        {/* Empty State */}
        {graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tasks to display
              </h3>
              <p className="text-gray-600">
                Create some tasks to see the dependency graph
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Instructions:</strong> Click and drag to pan • Scroll to zoom • Click nodes to highlight dependencies • <strong>Hold Alt + drag nodes</strong> to reposition them • <strong>Arrows show dependency direction</strong> (A → B means A depends on B)
        </p>
        <p className="mt-1">
          <strong>Drag & Drop:</strong> Hold Alt key and drag any node to create custom layouts • Use "Custom Layout" button to toggle between automatic and manual positioning • "Reset Layout" returns to automatic arrangement
        </p>
        <p className="mt-1">
          <strong>Arrow Visibility:</strong> Dark gray arrows = normal dependencies • Orange arrows = highlighted dependencies • Larger arrows when nodes are selected for better visibility
        </p>
      </div>
    </div>
  );
};

export default TaskGraph;