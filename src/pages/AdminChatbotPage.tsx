import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Search, 
  Calendar, 
  ThumbsUp, 
  ThumbsDown,
  Eye,
  User,
  Bot,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { chatbotApi } from '@/services/chatbotApi';
import { ChatbotConversation } from '@/types/chatbot';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateChatbotExcelReport } from '@/components/admin/chatbot/utils/chatbotExcelGenerator';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { usePagination } from '@/hooks/usePagination';
import DataPagination from '@/components/ui/data-pagination';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { logger } from "@/utils/logger";

// Extender localmente para incluir nuevos campos del backend
type AdminChatbotConversation = ChatbotConversation & {
  client_turn_id?: string;
};

const AdminChatbotPage: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<AdminChatbotConversation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

  // Fetch conversations
  const { data: conversationsData, isLoading, refetch } = useQuery({
    queryKey: ['chatbot-conversations'],
    queryFn: () => chatbotApi.getConversations({ per_page: 1000 }), // Traer todo para filtrar client-side
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const conversations = conversationsData?.data || [];

  // Filtrado client-side
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Filtro de búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        conv =>
          conv.id.toString().includes(searchQuery) ||
          conv.user_question.toLowerCase().includes(query) ||
          conv.bot_answer.toLowerCase().includes(query) ||
          conv.conversation_id?.toLowerCase().includes(query)
      );
    }

    // Filtro de fechas
    if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter(conv => new Date(conv.created_at) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(conv => new Date(conv.created_at) <= to);
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return filtered;
  }, [conversations, searchQuery, fromDate, toDate]);

  // Agrupar por conversation_id
  const groupedConversations = useMemo(() => {
    const groups: Record<string, ChatbotConversation[]> = {};
    
    filteredConversations.forEach(conv => {
      const key = conv.conversation_id || `single_${conv.id}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(conv);
    });

    // Ordenar conversaciones dentro de cada grupo
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return groups;
  }, [filteredConversations]);

  // Convertir grupos a array para paginación
  const conversationGroups = useMemo(() => {
    return Object.entries(groupedConversations).map(([conversationId, convs]) => ({
      conversationId,
      conversations: convs,
      firstMessage: convs[0],
      messageCount: convs.length,
      latestTimestamp: convs[convs.length - 1].created_at
    }));
  }, [groupedConversations]);

  // Paginación
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    setItemsPerPage,
  } = usePagination({
    data: conversationGroups,
    initialItemsPerPage: 10,
    initialPage: 1
  });

  const handleViewDetail = (conversation: ChatbotConversation) => {
    setSelectedConversation(conversation);
    setIsDetailOpen(true);
  };


  const handleExportExcel = () => {
    try {
      const dateRange = {
        includeAll: !fromDate && !toDate,
        start: fromDate ? new Date(fromDate) : undefined,
        end: toDate ? new Date(toDate) : undefined
      };

      const wb = generateChatbotExcelReport(filteredConversations, dateRange);
      const fileName = `reporte-chatbot-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
      
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Excel exportado",
        description: `Archivo ${fileName} descargado exitosamente con ${filteredConversations.length} conversaciones.`,
      });

      logger.debug("Reporte Excel exportado", {
        fileName,
        totalConversations: filteredConversations.length,
      });
    } catch (error) {
      logger.error("Error exportando Excel de chatbot", error instanceof Error ? error.message : error);
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el reporte Excel. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  const toggleConversationExpanded = (conversationId: string) => {
    setExpandedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  // Estadísticas
  const stats = useMemo(() => {
    const totalConversations = filteredConversations.length;
    const uniqueConversationIds = new Set(
      filteredConversations.map(c => c.conversation_id).filter(Boolean)
    ).size;
    const likesCount = filteredConversations.filter(c => c.feedback === 'like').length;
    const dislikesCount = filteredConversations.filter(c => c.feedback === 'dislike').length;
    const feedbackRate = totalConversations > 0 
      ? ((likesCount + dislikesCount) / totalConversations * 100).toFixed(1)
      : '0';

    return {
      total: totalConversations,
      uniqueConversations: uniqueConversationIds,
      likes: likesCount,
      dislikes: dislikesCount,
      feedbackRate
    };
  }, [filteredConversations]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-prosalud/10 p-3 rounded-lg">
                  <MessageSquare className="h-8 w-8 text-primary-prosalud" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-primary-prosalud">
                    Conversaciones del Chatbot
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Historial y análisis de interacciones con el asistente virtual
                  </CardDescription>
                </div>
              </div>
              <div>
                <Button 
                  onClick={handleExportExcel}
                  variant="default"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Mensajes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary-prosalud" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversaciones</p>
                  <p className="text-2xl font-bold">{stats.uniqueConversations}</p>
                </div>
                <User className="h-8 w-8 text-secondary-prosaludgreen" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Me gusta</p>
                  <p className="text-2xl font-bold text-green-600">{stats.likes}</p>
                </div>
                <ThumbsUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">No me gusta</p>
                  <p className="text-2xl font-bold text-red-600">{stats.dislikes}</p>
                </div>
                <ThumbsDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Feedback %</p>
                  <p className="text-2xl font-bold">{stats.feedbackRate}%</p>
                </div>
                <Filter className="h-8 w-8 text-accent-prosaludteal" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription className="text-gray-600">
              Filtra las conversaciones por búsqueda y rango de fechas
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Buscar por ID, preguntas y respuestas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha desde
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Fecha hasta
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setFromDate('');
                    setToDate('');
                  }}
                  className="h-10 w-full flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Conversaciones</CardTitle>
            <CardDescription>
              {totalItems} conversación{totalItems !== 1 ? 'es' : ''} encontrada{totalItems !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron conversaciones</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedData.map((group) => {
                  const isExpanded = expandedConversations.has(group.conversationId);
                  const firstConv = group.firstMessage;
                  
                  return (
                    <Collapsible
                      key={group.conversationId}
                      open={isExpanded}
                      onOpenChange={() => toggleConversationExpanded(group.conversationId)}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <CollapsibleTrigger asChild>
                          <div className="p-4 cursor-pointer hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    ID: {group.conversationId.substring(0, 12)}...
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {group.messageCount} mensaje{group.messageCount > 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(parseISO(group.latestTimestamp), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <User className="h-4 w-4 text-primary-prosalud mt-1 flex-shrink-0" />
                                  <p className="text-sm font-medium line-clamp-2">
                                    {firstConv.user_question}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="border-t p-4 bg-slate-50 space-y-4">
                            {group.conversations.map((conv, idx) => (
                              <div key={conv.id} className="space-y-3">
                                {idx > 0 && <div className="border-t pt-3" />}
                                
                                {/* Pregunta */}
                                <div className="flex gap-3">
                                  <div className="bg-primary-prosalud/10 p-2 rounded-lg h-fit">
                                    <User className="h-4 w-4 text-primary-prosalud" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-primary-prosalud mb-1">Usuario</p>
                                    <p className="text-sm text-gray-700">{conv.user_question}</p>
                                  </div>
                                </div>

                                {/* Respuesta */}
                                <div className="flex gap-3">
                                  <div className="bg-secondary-prosaludgreen/10 p-2 rounded-lg h-fit">
                                    <Bot className="h-4 w-4 text-secondary-prosaludgreen" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-secondary-prosaludgreen mb-1">Asistente</p>
                                    <p className="text-sm text-gray-700 line-clamp-3">{conv.bot_answer}</p>
                                  </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground ml-11">
                                  <div className="flex items-center gap-4">
                                    {conv.feedback && (
                                      <span className="flex items-center gap-1">
                                        {conv.feedback === 'like' ? (
                                          <ThumbsUp className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <ThumbsDown className="h-3 w-3 text-red-600" />
                                        )}
                                        {conv.feedback === 'like' ? 'Me gusta' : 'No me gusta'}
                                      </span>
                                    )}
                                    {conv.user_ip && (
                                      <span>IP: {conv.user_ip}</span>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewDetail(conv)}
                                    className="h-7 text-xs"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Ver detalle
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <DataPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={totalItems}
                  onPageChange={goToPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-50">
          <DialogHeader>
            <DialogTitle>Detalle de la Conversación</DialogTitle>
            <DialogDescription>
              Información completa del intercambio con el chatbot
            </DialogDescription>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="space-y-6">
              {/* Pregunta */}
              <div>
                <h3 className="text-sm font-semibold text-primary-prosalud mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Pregunta del Usuario
                </h3>
                <p className="text-sm bg-white p-4 rounded-lg">
                  {selectedConversation.user_question}
                </p>
              </div>

              {/* Respuesta */}
              <div>
                <h3 className="text-sm font-semibold text-secondary-prosaludgreen mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Respuesta del Asistente
                </h3>
                <div className="text-sm bg-white p-4 rounded-lg whitespace-pre-wrap">
                  {selectedConversation.bot_answer}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">ID</p>
                  <p className="font-medium">{selectedConversation.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Conversation ID</p>
                  <p className="font-medium font-mono text-xs">
                    {selectedConversation.conversation_id || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Client Turn ID</p>
                  <p className="font-medium font-mono text-xs break-all">
                    {selectedConversation.client_turn_id || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Fecha</p>
                  <p className="font-medium">
                    {format(parseISO(selectedConversation.created_at), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Feedback</p>
                  <div className="flex items-center gap-2">
                    {selectedConversation.feedback === 'like' && (
                      <>
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">Me gusta</span>
                      </>
                    )}
                    {selectedConversation.feedback === 'dislike' && (
                      <>
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-600">No me gusta</span>
                      </>
                    )}
                    {!selectedConversation.feedback && (
                      <span className="text-muted-foreground">Sin feedback</span>
                    )}
                  </div>
                </div>
                {selectedConversation.user_ip && (
                  <div>
                    <p className="text-muted-foreground mb-1">IP del Usuario</p>
                    <p className="font-medium font-mono text-xs">{selectedConversation.user_ip}</p>
                  </div>
                )}
                {selectedConversation.user_agent && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">User Agent</p>
                    <p className="font-medium text-xs break-all">{selectedConversation.user_agent}</p>
                  </div>
                )}
              </div>

              {/* Metadata JSON */}
              {selectedConversation.metadata && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Metadata Técnica</h3>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedConversation.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminChatbotPage;
