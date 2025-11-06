import React from "react";
import { Skeleton } from "./skeleton";

export const PageLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 animate-fade-in">
      {/* Header Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-6 w-96 mb-8" />
        
        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CardLoadingSkeleton = () => {
  return (
    <div className="space-y-4 animate-fade-in">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-3">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
};

interface TableLoadingSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableLoadingSkeleton: React.FC<TableLoadingSkeletonProps> = ({ 
  columns = 4, 
  rows = 5 
}) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex space-x-4 border-b pb-2">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex space-x-4 py-3">
          {[...Array(columns)].map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const EventDetailLoadingSkeleton = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb Skeleton */}
      <div className="mb-8 flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-1" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Article Card */}
      <article className="bg-card p-6 sm:p-8 rounded-lg shadow-xl">
        {/* Header Section */}
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-9 w-3/4 mb-3" />
          <Skeleton className="h-6 w-24" />
        </div>

        {/* Grid Layout */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Images (2/3) */}
          <div className="md:col-span-2 space-y-4">
            {/* Main Image/Carousel Skeleton */}
            <div className="bg-background-light p-0 rounded-lg border-0">
              <Skeleton className="h-[400px] sm:h-[450px] md:h-[500px] w-full rounded-md" />
              
              {/* Carousel Controls Skeleton */}
              <div className="mt-2 flex justify-center">
                <Skeleton className="h-4 w-24" />
              </div>
              
              {/* Thumbnails Skeleton */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="w-16 h-16 sm:w-20 sm:h-20 rounded-md" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Details (1/3) */}
          <aside className="md:col-span-1 space-y-6">
            {/* Description Section */}
            <div>
              <Skeleton className="h-7 w-48 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>

            {/* Event Details Card */}
            <div className="bg-background-light p-4 rounded-lg border border-prosalud-border">
              <Skeleton className="h-6 w-40 mb-3" />
              <ul className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <li key={i} className="flex items-start">
                    <Skeleton className="h-5 w-5 rounded mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation Section */}
            <div className="mt-8 pt-6 border-t border-prosalud-border">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="flex justify-between items-center gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
};
