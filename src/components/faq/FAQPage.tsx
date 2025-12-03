
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Info, FileText, Users, Gift, Settings, ExternalLink, ArrowRight, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { faqData, faqCategories, FAQItem } from '@/data/faqData';

const iconMap = {
  Info: Info,
  FileText: FileText,
  Users: Users,
  Gift: Gift,
  Settings: Settings
};

const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter FAQ items based on search query and category
  const filteredFAQs = useMemo(() => {
    let filtered = faqData;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  // Group FAQs by category for display
  const groupedFAQs = useMemo(() => {
    const groups: { [key: string]: FAQItem[] } = {};
    
    if (selectedCategory === 'all') {
      faqCategories.forEach(category => {
        groups[category.id] = filteredFAQs.filter(item => item.category === category.id);
      });
    } else {
      groups[selectedCategory] = filteredFAQs;
    }

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    return groups;
  }, [filteredFAQs, selectedCategory]);

  const handleChatbotClick = () => {
    // Disparar evento personalizado para abrir el chatbot
    window.dispatchEvent(new CustomEvent('openChatbot'));
  };

  return (
    <div className="min-h-screen bg-background-light">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary-prosalud to-primary-prosalud-dark text-white overflow-hidden">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center items-center gap-3 mb-6">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <HelpCircle className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                Preguntas Frecuentes
              </h1>
            </div>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-3xl mx-auto">
              Encuentra respuestas rápidas y precisas a las consultas más comunes sobre ProSalud, 
              nuestros servicios y trámites disponibles
            </p>

            {/* Search Bar */}
            <div className="relative mt-8 mb-6 max-w-2xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <Input
                  type="text"
                  placeholder="¿Qué necesitas saber? Busca aquí..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-6 py-3 text-base rounded-lg border border-gray-300 shadow-md bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-primary-prosalud transition-all"
                />
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setSelectedCategory('all')}
                className={`${
                  selectedCategory === 'all' 
                    ? 'bg-white border-white text-primary-prosalud shadow-md' 
                    : 'bg-white/10 border-white/30 text-white hover:bg-accent-prosaludteal hover:border-accent-prosaludteal'
                } rounded-lg px-4 py-2 transition-all font-medium`}
                size="sm"
              >
                Todas las categorías
              </Button>
              {faqCategories.map(category => {
                const IconComponent = iconMap[category.icon as keyof typeof iconMap];
                return (
                  <Button
                    key={category.id}
                    variant="outline"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`${
                      selectedCategory === category.id 
                        ? 'bg-white border-white text-primary-prosalud shadow-md' 
                        : 'bg-white/10 border-white/30 text-white hover:bg-accent-prosaludteal hover:border-accent-prosaludteal'
                    } rounded-lg px-4 py-2 transition-all font-medium`}
                    size="sm"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {category.name}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Results summary */}
          {searchQuery && (
            <div className="mb-8">
              <Card className="border-l-4 border-l-primary-prosalud bg-blue-50/50">
                <CardContent className="p-4">
                  <p className="text-gray-700 font-medium">
                    <Search className="inline h-4 w-4 mr-2" />
                    Se encontraron {filteredFAQs.length} resultado(s) para "{searchQuery}"
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FAQ Content */}
          {Object.keys(groupedFAQs).length === 0 ? (
            <Card className="text-center py-16 shadow-lg">
              <CardContent>
                <div className="text-gray-500">
                  <Search className="mx-auto h-16 w-16 text-gray-300 mb-6" />
                  <h3 className="text-2xl font-semibold mb-3 text-gray-700">No se encontraron resultados</h3>
                  <p className="text-lg">Intenta con otros términos de búsqueda o selecciona una categoría diferente.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedFAQs).map(([categoryId, items]) => {
              const category = faqCategories.find(cat => cat.id === categoryId);
              if (!category || items.length === 0) return null;

              const IconComponent = iconMap[category.icon as keyof typeof iconMap];

              return (
                <div key={categoryId} className="mb-12">
                  {selectedCategory === 'all' && (
                    <div className="mb-6">
                      <Card className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-0 shadow-sm">
                        <CardContent className="p-6">
                          <div className="flex items-center mb-3">
                            <div className="bg-primary-prosalud p-3 rounded-xl mr-4">
                              <IconComponent className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-gray-900">
                                {category.name}
                              </h2>
                              <p className="text-gray-600 mt-1">{category.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <Accordion type="single" collapsible className="space-y-4">
                    {items.map((faq) => (
                      <AccordionItem
                        key={faq.id}
                        value={faq.id}
                        className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                      >
                        <AccordionTrigger className="px-6 py-5 text-left hover:no-underline hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start justify-between w-full">
                            <h3 className="text-lg font-semibold text-gray-900 pr-4 leading-relaxed">
                              {faq.question}
                            </h3>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <div className="prose prose-gray max-w-none">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
                              {faq.answer}
                            </p>
                          </div>
                          
                          {/* Redirect button for service-related questions */}
                          {faq.redirectUrl && (
                            <div className="mt-6 pt-4 border-t border-gray-100">
                              <Button 
                                asChild
                                className="bg-primary-prosalud hover:bg-primary-prosalud-dark text-white font-medium"
                                size="sm"
                              >
                                <Link to={faq.redirectUrl}>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  {faq.redirectText}
                                  <ExternalLink className="h-3 w-3 ml-2" />
                                </Link>
                              </Button>
                            </div>
                          )}
                          
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex flex-wrap gap-2">
                              {faq.keywords.slice(0, 5).map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })
          )}

          {/* Contact Section */}
          <Card className="mt-12 bg-gradient-to-r from-primary-prosalud to-primary-prosalud-dark text-white shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white text-2xl font-bold">¿No encontraste lo que buscabas?</CardTitle>
                  <CardDescription className="text-white/90 text-base mt-2">
                    Si tienes una consulta específica que no está en nuestras preguntas frecuentes, no dudes en contactarnos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-white/90 text-base leading-relaxed">
                  Puedes utilizar nuestro chatbot disponible en el sitio web o acceder a los formularios de contacto específicos para cada servicio.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={handleChatbotClick}
                    variant="secondary" 
                    size="default"
                    className="bg-white text-primary-prosalud hover:bg-gray-100 font-semibold"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Usar Chatbot
                  </Button>
                  <Button 
                    asChild
                    size="default"
                    className="bg-accent-prosaludteal text-white hover:bg-accent-prosaludteal/90 font-semibold border-0"
                  >
                    <Link to="/contacto">
                      <FileText className="h-4 w-4 mr-2" />
                      Contacto
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
