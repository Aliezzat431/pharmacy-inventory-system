# Pharmacy Stock Management System

A high-performance, desktop-first pharmacy management application built with **Next.js**, **Electron**, and **MongoDB**. The system features a custom, premium **Glassmorphic UI** powered by **shadcn/ui** and **Tailwind CSS v4**.

## 🌟 Project Overview

This application is designed specifically for pharmacies to manage stock, sales, invoices, and employee sessions with a focus on speed, reliability, and aesthetics.

### 🎨 Key Features & UI
- **Premium Glassmorphism**: A state-of-the-art interface with blurred backgrounds, high-end gradients, and smooth spring-based animations.
- **100% MUI-Free**: Fully migrated to **shadcn/ui** and **Lucide icons** for better performance and customization.
- **RTL Support**: Native compatibility for Arabic speakers with automatic Right-to-Left layout adjustment.
- **Electron Desktop Wrapper**: Runs as a standalone desktop application with a local Next.js server.

## 🛠️ Technical Architecture

- **Frontend**: Next.js 15 (App Router), React 18, Tailwind CSS v4.
- **UI Components**: shadcn/ui (Radix UI primitives).
- **Icons**: Lucide React.
- **State Management**: Redux Toolkit (thunks for async logic).
- **Database**: MongoDB with Mongoose (Dual-pharmacy support).
- **Desktop Environment**: Electron with custom IPC-less server architecture.
- **Real-time**: Socket.io for live staff chat.

## 📦 Key Modules

1. **Dashboard**: Real-time analytics, debt monitoring, and daily summaries.
2. **Sales (Checkout)**: High-speed barcode scanning, FIFO batch merging, and multi-unit support.
3. **Stock Management**: Batch-based tracking, expiry monitoring, and SKU generation.
4. **Inventory Reports**: Detailed analytics on movement, profits, and stock levels.
5. **Invoices**: Professional receipt generation and history tracking.
6. **ChatWidget**: Real-time internal staff communication tool.
7. **Debt Tracking**: Comprehensive ledger for customers and settlements.

## 🚀 Commands

- `npm run dev`: Starts the Next.js development server.
- `npm run electron:dev`: Launches the desktop application in developer mode.
- `node clearDb.js`: Utility to reset both configured databases (Pharmacy 1 & 2).
- `npm run build`: Generates the production Next.js build.

## 📁 Directory Structure
- `/src/app`: Application pages and API routes.
- `/src/components/ui`: Core shadcn components.
- `/src/lib`: Redux store, database connection, and utility functions.
- `/public`: Static assets (Logos, icons).

---
*Developed with a focus on visual excellence and operational efficiency.*
