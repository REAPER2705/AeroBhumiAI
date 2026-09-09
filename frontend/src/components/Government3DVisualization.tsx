/**
 * Government Case 3D Visualization
 * 
 * Lightweight 3D spatial visualization using SVG 3D projection
 * Shows parcel blocks, building blocks, and conflict visualization
 */

import React, { useEffect, useState } from 'react';
import { GovernmentCase, get3DVisualizationData } from '../utils/governmentMockData';

interface Government3DVisualizationProps {
  selectedCase: GovernmentCase | null;
  mapView?: string;
}

interface Block {
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  color: string;
  label: string;
}

export default function Government3DVisualization({ selectedCase, mapView = 'comparison' }: Government3DVisualizationProps) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    if (selectedCase) {
      const data = get3DVisualizationData(selectedCase.parcel_id);
      const blockList: Block[] = [
        { ...data.parcelBlock, color: '#22c55e', label: 'Parcel' },
        { ...data.buildingBlock, color: '#ef4444', label: 'Building' }
      ];
      
      if (data.conflictBlock) {
        blockList.push({ ...data.conflictBlock, color: '#3b82f6', label: 'Conflict' });
      }
      
      setBlocks(blockList);
    }
  }, [selectedCase]);

  if (!selectedCase || blocks.length === 0) {
    return (
      <div className="w-full h-full bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Select a case to view 3D visualization</p>
      </div>
    );
  }

  // Simple isometric 3D projection
  const scale = 50;
  const iso = (x: number, y: number, z: number) => {
    const iso_x = (x - y) * Math.cos(Math.PI / 6);
    const iso_y = (x + y) * Math.sin(Math.PI / 6) - z;
    return [iso_x * scale + 150, iso_y * scale + 150];
  };

  const drawBlock = (block: Block, index: number) => {
    const [x, y, z] = block.position;
    const { width, height, depth } = block;

    const corners = [
      [x, y, z],
      [x + width, y, z],
      [x + width, y + depth, z],
      [x, y + depth, z],
      [x, y, z + height],
      [x + width, y, z + height],
      [x + width, y + depth, z + height],
      [x, y + depth, z + height]
    ];

    const projectedCorners = corners.map(([cx, cy, cz]) => iso(cx, cy, cz));

    const faces = [
      {
        points: [projectedCorners[0], projectedCorners[1], projectedCorners[5], projectedCorners[4]],
        opacity: 0.9
      },
      {
        points: [projectedCorners[4], projectedCorners[5], projectedCorners[6], projectedCorners[7]],
        opacity: 1
      },
      {
        points: [projectedCorners[1], projectedCorners[2], projectedCorners[6], projectedCorners[5]],
        opacity: 0.7
      }
    ];

    return (
      <g key={index}>
        {faces.map((face, faceIdx) => {
          const pathData = face.points
            .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`)
            .join(' ') + ' Z';

          return (
            <path
              key={faceIdx}
              d={pathData}
              fill={block.color}
              fillOpacity={face.opacity}
              stroke={block.color}
              strokeWidth="1"
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      <svg width="100%" height="100%" viewBox="0 0 400 400" className="bg-gray-50">
        <line x1="50" y1="300" x2="350" y2="300" stroke="#d1d5db" strokeWidth="1" strokeDasharray="3,3" />
        {blocks.map((block, index) => drawBlock(block, index))}
        <text x="10" y="25" fontSize="12" fontWeight="bold" fill="#374151">
          3D Spatial View
        </text>
        <text x="10" y="40" fontSize="10" fill="#6b7280">
          {selectedCase.parcel_id} - {selectedCase.conflict_type}
        </text>
      </svg>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs font-bold text-gray-700 mb-1">Components:</div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 border border-green-600"></div>
            <span className="text-gray-600">Parcel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 border border-red-600"></div>
            <span className="text-gray-600">Building</span>
          </div>
          {blocks.some(b => b.color === '#3b82f6') && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 border border-blue-600"></div>
              <span className="text-gray-600">Conflict</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
