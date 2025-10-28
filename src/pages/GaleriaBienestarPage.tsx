
"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import MainLayout from "@/components/layout/MainLayout"
import EventsGrid from "@/components/galeria-bienestar/EventsGrid"
import EventFilters from "@/components/galeria-bienestar/EventFilters"
import DataPagination from "@/components/ui/data-pagination"
import { getWellnessEvents } from "@/services/wellnessEventsApi"
import { Link } from "react-router-dom"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Image, GalleryVertical, Home } from "lucide-react"
import { usePagination } from "@/hooks/usePagination"
import { PageLoadingSkeleton } from "@/components/ui/loading-skeleton";
import ApiConnectivityTest from "@/components/debug/ApiConnectivityTest";

const GaleriaBienestarPage: React.FC = () => {
  const [sortOrder, setSortOrder] = useState<"date-desc" | "date-asc">("date-desc")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  // Fetch events from API
  const { data: events = [], isLoading, error } = useQuery({
    queryKey: ['wellness-events-public'],
    queryFn: () => getWellnessEvents({ is_visible: true }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const uniqueCategories = useMemo(() => {
    const categories = new Set(events.map((event) => event.category).filter(Boolean) as string[])
    return ["all", ...Array.from(categories).sort((a, b) => a.localeCompare(b))]
  }, [events])

  const processedEvents = useMemo(() => {
    let filteredEvents = events.map((event) => ({ ...event }))

    if (filterCategory !== "all") {
      filteredEvents = filteredEvents.filter((event) => event.category === filterCategory)
    }

    if (sortOrder === "date-desc") {
      filteredEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else if (sortOrder === "date-asc") {
      filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return filteredEvents.map((event, index) => ({
      ...event,
      _sortKey: `${sortOrder}-${filterCategory}-${index}`,
    }))
  }, [events, sortOrder, filterCategory])

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData: eventsToDisplay,
    goToPage,
    setItemsPerPage
  } = usePagination({
    data: processedEvents,
    initialItemsPerPage: 12
  })

  useEffect(() => {
    window.scrollTo(0, 0)
    goToPage(1) // Reset to first page when filters change
  }, [sortOrder, filterCategory, goToPage])

  const handlePageChange = (page: number) => {
    goToPage(page)
    window.scrollTo(0, 0)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <PageLoadingSkeleton />
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto pt-6 pb-20 px-4 md:px-6 lg:px-8 py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error al cargar eventos</h2>
            <p className="text-muted-foreground">
              No se pudieron cargar los eventos de bienestar. Por favor, intenta de nuevo más tarde.
            </p>
          </div>
          
          {/* Componente de diagnóstico temporal */}
          <ApiConnectivityTest />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto pt-6 pb-2 px-4 md:px-6 lg:px-8 py-10">
        <Breadcrumb>
          <BreadcrumbList className="flex items-center space-x-2 text-sm">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/"
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Inicio
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1 font-medium text-foreground">
                <GalleryVertical className="h-4 w-4" />
                Galería de Bienestar
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="container mx-auto pt-6 pb-20 px-4 md:px-6 lg:px-8 py-10">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Image className="h-8 w-8 text-primary-prosalud-dark" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-prosalud-dark tracking-tight">
              Galería de Bienestar
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 mb-4">
            Explora los momentos y actividades que hemos compartido juntos, fortaleciendo nuestra comunidad ProSalud.
          </p>
        </div>

        <EventFilters
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          uniqueCategories={uniqueCategories}
        />

        <EventsGrid events={eventsToDisplay} />

        {totalPages > 1 && (
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
            className="mt-12"
          />
        )}
      </div>
    </MainLayout>
  )
}

export default GaleriaBienestarPage
