import { useState, useCallback, useEffect } from 'react';

interface Position {
    x: number;
    y: number;
}

interface UseDraggableOptions {
    initialPosition?: Position;
    bounds?: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    };
}

interface UseDraggableReturn {
    position: Position;
    isDragging: boolean;
    handleMouseDown: (e: React.MouseEvent) => void;
    dragHandleProps: {
        onMouseDown: (e: React.MouseEvent) => void;
        style: {
            cursor: string;
        };
        className: string;
    };
    panelProps: {
        style: {
            left: number;
            top: number;
            cursor?: string;
        };
    };
}

/**
 * Custom hook to make a component draggable
 * @param options - Configuration options for draggable behavior
 * @returns Drag handlers and position state
 */
export const useDraggable = (options: UseDraggableOptions = {}): UseDraggableReturn => {
    const { initialPosition, bounds } = options;

    const [position, setPosition] = useState<Position>(
        initialPosition || { x: 100, y: 100 }
    );
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only allow dragging from the drag handle
        if ((e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    }, [position]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            let newX = e.clientX - dragStart.x;
            let newY = e.clientY - dragStart.y;

            // Apply bounds if specified
            if (bounds) {
                if (bounds.left !== undefined) newX = Math.max(bounds.left, newX);
                if (bounds.right !== undefined) newX = Math.min(bounds.right, newX);
                if (bounds.top !== undefined) newY = Math.max(bounds.top, newY);
                if (bounds.bottom !== undefined) newY = Math.min(bounds.bottom, newY);
            }

            setPosition({ x: newX, y: newY });
        }
    }, [isDragging, dragStart, bounds]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add and remove mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return {
        position,
        isDragging,
        handleMouseDown,
        dragHandleProps: {
            onMouseDown: handleMouseDown,
            style: {
                cursor: 'grab'
            },
            className: 'drag-handle'
        },
        panelProps: {
            style: {
                left: position.x,
                top: position.y,
                cursor: isDragging ? 'grabbing' : undefined
            }
        }
    };
};

export default useDraggable;
