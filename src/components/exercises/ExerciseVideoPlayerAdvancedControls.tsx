import React from "react";
import { Copy, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

interface ExerciseVideoPlayerAdvancedControlsProps {
  playbackRate: number;
  showSpeedMenu: boolean;
  onSpeedMenuChange: (open: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onTogglePip: () => void;
}

const ExerciseVideoPlayerAdvancedControls: React.FC<
  ExerciseVideoPlayerAdvancedControlsProps
> = ({ playbackRate, showSpeedMenu, onSpeedMenuChange, onSpeedChange, onTogglePip }) => {
  return (
    <>
      <DropdownMenu open={showSpeedMenu} onOpenChange={onSpeedMenuChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 px-2 text-white hover:text-white hover:bg-white/10 text-xs font-mono"
          >
            {playbackRate}x
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {SPEED_OPTIONS.map((speed) => (
            <DropdownMenuItem
              key={speed}
              onClick={() => onSpeedChange(speed)}
              className={cn("justify-center font-mono", playbackRate === speed && "bg-accent")}
            >
              {speed}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 shrink-0 text-white hover:text-white hover:bg-white/20"
        onClick={onTogglePip}
        title="Picture-in-Picture (p)"
      >
        <Copy className="w-4 h-4" />
      </Button>

      <div className="absolute -top-10 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white/50 hover:text-white/80 hover:bg-white/10"
          title="Atalhos: Espaço/K=play, M=mudo, F=tela cheia, P=PiP, +/- velocidade, ←/→=seek, -/+ skip 10s"
        >
          <Keyboard className="w-3 h-3" />
        </Button>
      </div>
    </>
  );
};

export default ExerciseVideoPlayerAdvancedControls;
