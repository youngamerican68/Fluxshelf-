"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface ColorPickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  maxColors?: number;
}

export function ColorPicker({
  colors,
  onChange,
  maxColors = 5,
}: ColorPickerProps) {
  const [newColor, setNewColor] = useState("#000000");

  const addColor = () => {
    if (colors.length < maxColors && !colors.includes(newColor)) {
      onChange([...colors, newColor]);
    }
  };

  const removeColor = (index: number) => {
    onChange(colors.filter((_, i) => i !== index));
  };

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="#000000"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="pl-12"
          />
          <input
            type="color"
            value={isValidHex(newColor) ? newColor : "#000000"}
            onChange={(e) => setNewColor(e.target.value)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border-0"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addColor}
          disabled={colors.length >= maxColors || !isValidHex(newColor)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {colors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted rounded-full pl-1 pr-2 py-1"
            >
              <div
                className="w-6 h-6 rounded-full border"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-mono">{color}</span>
              <button
                type="button"
                onClick={() => removeColor(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Add up to {maxColors} brand colors to influence generated images
      </p>
    </div>
  );
}
