# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Lab Compass" (Lab Compass for I類配属システム) built with WXT framework. It enhances the UEC (University of Electro-Communications) I類 student lab allocation system website by visualizing lab assignment status and showing gaps between student preferences and actual assignments.

## Development Commands

```bash
# Development (Chrome)
npm run dev

# Development (Firefox)
npm run dev:firefox

# Build for production
npm run build

# Build for Firefox
npm run build:firefox

# Create extension package
npm run zip

# Create extension package for Firefox
npm run zip:firefox

# Type checking
npm run compile

# Setup after installation
npm run postinstall
```

## Architecture

### Extension Structure
- **Framework**: WXT (Web Extension Toolkit) with Manifest V3
- **Target**: UEC I類 lab allocation system (`phase1show_labo.php`)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript

### Core Components

#### Content Script (`entrypoints/content.ts` → `src/content/content.ts`)
- Entry point that runs on the target webpage
- Orchestrates the entire enhancement process
- Executes `initLabCompass()` when DOM is ready

#### Parser Module (`src/content/parser.ts`)
- **Lab Data Parsing**: Extracts lab information from summary tables
- **Student Information**: Identifies current student and their preferences
- **Capacity Analysis**: Parses lab capacity breakdown (3rd year, senior, K-course)
- **Preference Mapping**: Maps student choices to lab data
- **Status Calculation**: Determines lab availability status based on thresholds

#### UI Enhancement (`src/content/ui.ts`)
- **Table Modernization**: Adds CSS classes to existing tables
- **Visual Enhancement**: Colors and highlights based on competition rates
- **Student Hover Sync**: Shows student details on hover
- **Program Summary Panels**: Adds information panels for program statistics
- **Tooltip System**: Displays additional information on interaction

#### Popup (`entrypoints/popup/`)
- Simple information panel explaining the extension
- Built with vanilla TypeScript and CSS
- No complex state management

### Key Types (`src/types/types.ts`)

- **LabInfo**: Lab capacity, applicant statistics, competition rates
- **StudentInfo**: Student ID, name, program, and preferences
- **CapacityBreakdown**: Breakdown by student year/type
- **ProgramSummary/Aggregate**: Program-level statistics

### Data Flow

1. Content script injects into target page
2. Parser extracts data from HTML tables
3. UI module enhances the page with visual indicators
4. No external API calls - works entirely with local page data
5. No persistent storage - all data exists in memory

### Styling Architecture

- **Tailwind CSS**: Main styling framework
- **CSS Classes**: Prefixed with `labx-` to avoid conflicts
- **Dynamic Styling**: Colors and visual states applied via JavaScript
- **Responsive Design**: Adapts to different table structures

## Development Notes

- Extension runs entirely client-side with no external requests
- WXT framework provides hot-reload during development
- All parsing logic is specific to the target website's HTML structure
- CSS is scoped to prevent conflicts with host page
- No build steps required for CSS - Tailwind processes automatically

## Target Website Structure

The extension is designed specifically for:
- URL: `https://www.edu.cc.uec.ac.jp/~na131006/cgi-bin/SWG/system/phase1/phase1show_labo.php*`
- Contains lab summary tables and detailed applicant information
- Uses specific Japanese headers for data extraction