# FloodGuard Surabaya - Development Guide

## Overview

This repository contains **FloodGuard Surabaya**, an isometric flood-management simulation game for Surabaya:
- **FloodGuard Surabaya** (`/`) - Main city simulation with traffic, pedestrians, and economy
- **Theme Park Mode** (`/coaster`) - Theme park builder with rides and guests

**Developer:** Alvin Zanua Putra  
**Community:** Institut Teknologi Sepuluh Nopember (ITS)  
**Live:** https://floodguard-surabaya.vercel.app/  
**Tech Stack**: Next.js 16 + React 19 + TypeScript + TailwindCSS + HTML5 Canvas

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Production build (includes image compression) |
| `npm run lint` | Run ESLint checks |
| `npm run start` | Start production server |

## Architecture Notes

- **Frontend-only**: No database or backend required for core functionality
- **State storage**: localStorage (client-side)
- **Supabase**: Optional, only for Co-op multiplayer features
- **Rendering**: Custom HTML5 Canvas engine (no external game libraries)
- **Hot reload**: Dev server uses Turbopack for fast compilation (~700ms ready time)

## Known Lint Warnings

The codebase has pre-existing React Hooks warnings (`react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`). These are intentional patterns in the game systems and don't affect functionality.

## Routes

- `/` - FloodGuard Surabaya main game
- `/coaster` - Theme park builder
- `/coop/[roomCode]` - Multiplayer co-op
- `/coaster/coop/[roomCode]` - Theme park multiplayer co-op
