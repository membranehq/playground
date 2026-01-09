import { Handle, Position } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PlusNodeProps {
  data: {
    parentId: string;
    createNewNode: (afterId: string) => void;
  };
}

export function PlusNode({ data }: PlusNodeProps) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0! top-0! pointer-events-none!"
        style={{
          top: 0,
          left: '50%',
          width: '0px',
          height: '0px',
          transform: 'translateX(-1px)',
          border: 'none',
          borderRadius: 0,
          background: 'transparent',
        }}
      />

      <div className="flex items-center justify-center w-[240px] h-[18px]">
        <Button
          variant="outline"
          className="h-4 w-4 p-0 aspect-square rounded-full border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 [&_svg]:!size-2"
          onClick={() => data.createNewNode(data.parentId)}
        >
          <Plus className="text-gray-600" />
        </Button>
      </div>
    </div>
  );
}


