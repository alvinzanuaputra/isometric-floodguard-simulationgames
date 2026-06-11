'use client';

import React, { useMemo } from 'react';
import { useMessages } from 'gt-next';
import { Tile, BuildingType, TOOL_INFO, Tool } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CloseIcon } from '@/components/ui/Icons';
import { useGame } from '@/context/GameContext';
import { 
  SERVICE_CONFIG, 
  SERVICE_BUILDING_TYPES,
  SERVICE_MAX_LEVEL,
  SERVICE_RANGE_INCREASE_PER_LEVEL,
  SERVICE_UPGRADE_COST_BASE,
} from '@/lib/simulation';

interface TileInfoPanelProps {
  tile: Tile;
  services: import('@/types/game').ServiceCoverage;
  onClose: () => void;
  isMobile?: boolean;
}

export function TileInfoPanel({ 
  tile, 
  services, 
  onClose,
  isMobile = false
}: TileInfoPanelProps) {
  const { x, y } = tile;
  const { state, upgradeServiceBuilding } = useGame();
  const m = useMessages();

  const ZONE_LABELS: Record<string, string> = {
    none: 'Tanpa Zona',
    residential: 'Permukiman',
    commercial: 'Komersial',
    industrial: 'Industri',
  };

  const buildingInfo = TOOL_INFO[tile.building.type as Tool];
  const buildingLabel = buildingInfo
    ? String(m(buildingInfo.name))
    : tile.building.type.replace(/_/g, ' ');
  
  // Check if this is a service building
  const isServiceBuilding = SERVICE_BUILDING_TYPES.has(tile.building.type);
  
  // Calculate upgrade cost and info for service buildings
  const upgradeInfo = useMemo(() => {
    if (!isServiceBuilding) return null;
    
    const buildingType = tile.building.type;
    // Service buildings are also Tools, so we can safely cast
    const baseCost = (TOOL_INFO as Record<string, { cost: number }>)[buildingType]?.cost ?? 0;
    const currentLevel = tile.building.level;
    
    if (currentLevel >= SERVICE_MAX_LEVEL) return null;
    
    const upgradeCost = baseCost * Math.pow(SERVICE_UPGRADE_COST_BASE, currentLevel);
    const canAfford = state.stats.money >= upgradeCost;
    const isUnderConstruction = tile.building.constructionProgress !== undefined && tile.building.constructionProgress < 100;
    const isAbandoned = tile.building.abandoned;
    
    // Get base range and calculate effective range
    const config = SERVICE_CONFIG[buildingType as keyof typeof SERVICE_CONFIG];
    const baseRange = config?.range ?? 0;
    const currentEffectiveRange = Math.floor(baseRange * (1 + (currentLevel - 1) * SERVICE_RANGE_INCREASE_PER_LEVEL));
    const nextEffectiveRange = Math.floor(baseRange * (1 + currentLevel * SERVICE_RANGE_INCREASE_PER_LEVEL));
    
    return {
      cost: upgradeCost,
      canAfford,
      isUnderConstruction,
      isAbandoned,
      currentLevel,
      maxLevel: SERVICE_MAX_LEVEL,
      baseRange,
      currentEffectiveRange,
      nextEffectiveRange,
    };
  }, [isServiceBuilding, tile.building, state.stats.money]);
  
  const handleUpgrade = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!upgradeInfo || !upgradeInfo.canAfford) return;
    const success = upgradeServiceBuilding(x, y);
    if (success) {
      // Optionally add notification here
    }
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <Card 
      className={`${isMobile ? 'fixed left-0 right-0 w-full rounded-none border-x-0 border-t border-b z-30' : 'absolute top-4 right-4 w-72 z-50'}`} 
      style={isMobile ? { top: 'calc(72px + env(safe-area-inset-top, 0px))' } : undefined}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-sans">Petak ({x}, {y})</CardTitle>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <CloseIcon size={14} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bangunan</span>
          <span>{buildingLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Zona</span>
          <Badge variant={
            tile.zone === 'residential' ? 'default' :
            tile.zone === 'commercial' ? 'secondary' :
            tile.zone === 'industrial' ? 'outline' : 'secondary'
          } className={
            tile.zone === 'residential' ? 'bg-green-500/20 text-green-400' :
            tile.zone === 'commercial' ? 'bg-blue-500/20 text-blue-400' :
            tile.zone === 'industrial' ? 'bg-amber-500/20 text-amber-400' : ''
          }>
            {ZONE_LABELS[tile.zone] ?? tile.zone}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tingkat</span>
          <span>{tile.building.level}/5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Populasi</span>
          <span>{tile.building.population}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Pekerjaan</span>
          <span>{tile.building.jobs}</span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Listrik</span>
          <Badge variant={tile.building.powered ? 'default' : 'destructive'}>
            {tile.building.powered ? 'Terhubung' : 'Tanpa Listrik'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Air</span>
          <Badge variant={tile.building.watered ? 'default' : 'destructive'} className={tile.building.watered ? 'bg-cyan-500/20 text-cyan-400' : ''}>
            {tile.building.watered ? 'Terhubung' : 'Tanpa Air'}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nilai Lahan</span>
          <span>${tile.landValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Polusi</span>
          <span className={tile.pollution > 50 ? 'text-red-400' : tile.pollution > 25 ? 'text-amber-400' : 'text-green-400'}>
            {Math.round(tile.pollution)}%
          </span>
        </div>
        
        {tile.building.onFire && (
          <>
            <Separator />
            <div className="flex justify-between text-red-400">
              <span>KEBAKARAN!</span>
              <span>{Math.round(tile.building.fireProgress)}% kerusakan</span>
            </div>
          </>
        )}
        
        <Separator />
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Cakupan Layanan</div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Evakuasi</span>
            <span>{Math.round(services.evacuation[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Penyelamatan</span>
            <span>{Math.round(services.rescue[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Medis</span>
            <span>{Math.round(services.medical[y][x])}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Siaga</span>
            <span>{Math.round(services.preparedness[y][x])}%</span>
          </div>
        </div>
        
        {upgradeInfo && (
          <>
            <Separator />
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Peningkatan</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Jangkauan</span>
                <span className="font-mono">
                  {upgradeInfo.currentEffectiveRange} → {upgradeInfo.nextEffectiveRange} tile
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Biaya Peningkatan</span>
                <span className={`font-mono ${upgradeInfo.canAfford ? 'text-foreground' : 'text-red-400'}`}>
                  ${upgradeInfo.cost.toLocaleString()}
                </span>
              </div>
              <Button
                onClick={handleUpgrade}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!upgradeInfo.canAfford || upgradeInfo.isUnderConstruction || upgradeInfo.isAbandoned}
                className="w-full"
                size="sm"
              >
                Tingkatkan ke Level {upgradeInfo.currentLevel + 1}
              </Button>
              {!upgradeInfo.canAfford && (
                <p className="text-xs text-muted-foreground text-center">
                  Dana tidak cukup
                </p>
              )}
              {upgradeInfo.isUnderConstruction && (
                <p className="text-xs text-muted-foreground text-center">
                  Bangunan sedang dibangun
                </p>
              )}
              {upgradeInfo.isAbandoned && (
                <p className="text-xs text-muted-foreground text-center">
                  Bangunan ditinggalkan
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
