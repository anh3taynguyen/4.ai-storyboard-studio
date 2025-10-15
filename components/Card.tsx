
import React from 'react';
import { EyeIcon, DownloadIcon, TrashIcon, RefreshIcon, PlayIcon } from './Icons';

interface CardAction {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
}

interface CardProps {
  src: string;
  isSelected: boolean;
  onSelect: () => void;
  actions: CardAction[];
  children?: React.ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  // Fix: Add missing drag event handlers to support drag-and-drop sorting.
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const Card: React.FC<CardProps> = ({ src, isSelected, onSelect, actions, children, draggable, onDragStart, onDragOver, onDrop, onDragEnter, onDragEnd }) => {
  return (
    <div
      className={`relative group border-2 rounded-lg overflow-hidden transition-all duration-200 ${isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-700 hover:border-gray-500'}`}
      onClick={onSelect}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      // Fix: Pass drag event handlers to the underlying div element.
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
    >
      <img src={src} alt="card content" className="w-full h-full object-cover aspect-square" />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex justify-center items-center">
        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="p-1.5 bg-gray-800 bg-opacity-70 rounded-full text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
};
export default Card;
