import { Globe, Landmark, Scale, Swords, Thermometer, Wheat, Wine } from "lucide-react";

const ICONS = {
  thermometer: Thermometer,
  swords: Swords,
  scale: Scale,
  wheat: Wheat,
  landmark: Landmark,
  wine: Wine,
  globe: Globe,
} as const;

export function TopicIcon({ name }: { name: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Globe;
  return <Icon aria-hidden="true" size={18} strokeWidth={1.75} />;
}
