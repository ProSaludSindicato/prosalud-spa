/**
 * PÁGINA TEMPORAL - SOLO PARA PRUEBAS
 * 
 * ⚠️ ELIMINAR DESPUÉS DE VERIFICAR LAS VARIABLES DE ENTORNO
 * 
 * Ruta: /admin/temp-debug-verification-env-variables-check
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { API_CONFIG, RECAPTCHA_CONFIG } from '@/config/api';

const TempEnvDebugPage: React.FC = () => {
  // Obtener todas las variables de entorno relevantes
  const envVars = {
    VITE_PUBLIC_API_BASE_URL: import.meta.env.VITE_PUBLIC_API_BASE_URL,
    VITE_ADMIN_API_BASE_URL: import.meta.env.VITE_ADMIN_API_BASE_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_RECAPTCHA_SITE_KEY: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_APP_ENABLE_DEBUG_LOGS: import.meta.env.VITE_APP_ENABLE_DEBUG_LOGS,
  };

  // Valores actuales usados (con fallbacks)
  const currentValues = {
    PUBLIC_BASE_URL: API_CONFIG.PUBLIC_BASE_URL,
    ADMIN_BASE_URL: API_CONFIG.ADMIN_BASE_URL,
    BASE_URL: API_CONFIG.BASE_URL,
    RECAPTCHA_SITE_KEY: RECAPTCHA_CONFIG.SITE_KEY,
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY 
      ? `${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.substring(0, 20)}...` 
      : undefined,
    DEBUG_LOGS: import.meta.env.VITE_APP_ENABLE_DEBUG_LOGS,
  };

  // Verificar qué está definido y qué no
  const getStatus = (value: string | undefined) => {
    if (value) {
      return { defined: true, icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, text: 'DEFINIDA' };
    }
    return { defined: false, icon: <XCircle className="h-5 w-5 text-red-600" />, text: 'NO DEFINIDA (usando fallback)' };
  };

  // Función para determinar si está usando fallback
  const isUsingFallback = (varName: string, currentValue: string | undefined) => {
    if (!currentValue) return true;
    if (!envVars[varName as keyof typeof envVars]) return true;
    
    // Verificar si el valor actual coincide con los fallbacks conocidos
    if (varName === 'VITE_PUBLIC_API_BASE_URL' || varName === 'VITE_ADMIN_API_BASE_URL' || varName === 'VITE_API_BASE_URL') {
      return currentValue === 'https://prosalud.test';
    }
    if (varName === 'VITE_RECAPTCHA_SITE_KEY') {
      return currentValue === '6LfTGhksAAAAANaQkiOUEGeJkHjoaFyzLNSv5xiP';
    }
    return false;
  };

  const variables = [
    {
      name: 'VITE_PUBLIC_API_BASE_URL',
      envValue: envVars.VITE_PUBLIC_API_BASE_URL,
      currentValue: currentValues.PUBLIC_BASE_URL,
      fallback: 'https://prosalud.test',
      description: 'URL base para el sitio web público',
    },
    {
      name: 'VITE_ADMIN_API_BASE_URL',
      envValue: envVars.VITE_ADMIN_API_BASE_URL,
      currentValue: currentValues.ADMIN_BASE_URL,
      fallback: 'https://prosalud.test',
      description: 'URL base para el panel de administración',
    },
    {
      name: 'VITE_API_BASE_URL',
      envValue: envVars.VITE_API_BASE_URL,
      currentValue: currentValues.BASE_URL,
      fallback: 'https://prosalud.test',
      description: 'URL base general (fallback para ambas)',
    },
    {
      name: 'VITE_RECAPTCHA_SITE_KEY',
      envValue: envVars.VITE_RECAPTCHA_SITE_KEY,
      currentValue: currentValues.RECAPTCHA_SITE_KEY,
      fallback: '6LfTGhksAAAAANaQkiOUEGeJkHjoaFyzLNSv5xiP',
      description: 'Clave del sitio para reCAPTCHA',
    },
    {
      name: 'VITE_SUPABASE_URL',
      envValue: envVars.VITE_SUPABASE_URL,
      currentValue: currentValues.SUPABASE_URL,
      fallback: 'N/A',
      description: 'URL de Supabase',
    },
    {
      name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
      envValue: envVars.VITE_SUPABASE_PUBLISHABLE_KEY ? '***DEFINIDA***' : undefined,
      currentValue: currentValues.SUPABASE_PUBLISHABLE_KEY,
      fallback: 'N/A',
      description: 'Clave pública de Supabase',
      isSensitive: true,
    },
    {
      name: 'VITE_APP_ENABLE_DEBUG_LOGS',
      envValue: envVars.VITE_APP_ENABLE_DEBUG_LOGS,
      currentValue: currentValues.DEBUG_LOGS || 'false',
      fallback: 'false',
      description: 'Habilitar logs de depuración',
    },
  ];

  const undefinedCount = variables.filter(v => !v.envValue).length;
  const usingFallbackCount = variables.filter(v => isUsingFallback(v.name, v.currentValue || undefined)).length;

  // También imprimir en consola para facilitar copiar
  console.log('='.repeat(80));
  console.log('🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO');
  console.log('='.repeat(80));
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log('\n📋 VARIABLES DE ENTORNO:');
  variables.forEach(v => {
    const status = getStatus(v.envValue);
    console.log(`\n${status.icon.props.className?.includes('green') ? '✅' : '❌'} ${v.name}`);
    console.log(`   Estado: ${status.text}`);
    console.log(`   Valor en env: ${v.envValue || '[NO DEFINIDA]'}`);
    console.log(`   Valor actual usado: ${v.currentValue}`);
    if (isUsingFallback(v.name, v.currentValue)) {
      console.log(`   ⚠️  Usando fallback: ${v.fallback}`);
    }
    console.log(`   Descripción: ${v.description}`);
  });
  console.log('\n' + '='.repeat(80));
  console.log(`📊 RESUMEN: ${undefinedCount} no definidas, ${usingFallbackCount} usando fallback`);
  console.log('='.repeat(80));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="mb-8 border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Verificación Temporal de Variables de Entorno
              </h1>
            </div>
            <p className="text-gray-600 mt-2">
              Esta página es temporal y debe ser eliminada después de verificar las variables de entorno.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Revisa también la consola del navegador para ver los detalles completos.
            </p>
          </div>

          {/* Resumen */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Total Variables</div>
              <div className="text-2xl font-bold text-blue-900">{variables.length}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Definidas</div>
              <div className="text-2xl font-bold text-green-900">{variables.length - undefinedCount}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">No Definidas / Usando Fallback</div>
              <div className="text-2xl font-bold text-red-900">{usingFallbackCount}</div>
            </div>
          </div>

          {/* Lista de Variables */}
          <div className="space-y-4">
            {variables.map((variable) => {
              const status = getStatus(variable.envValue);
              const usingFallback = isUsingFallback(variable.name, variable.currentValue);

              return (
                <div
                  key={variable.name}
                  className={`border rounded-lg p-6 ${
                    variable.envValue
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {status.icon}
                        <h3 className="text-lg font-semibold text-gray-900 font-mono">
                          {variable.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            status.defined
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status.text}
                        </span>
                        {usingFallback && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                            USANDO FALLBACK
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{variable.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Valor en Variable de Entorno:
                      </div>
                      <div className="bg-white border rounded p-3 font-mono text-sm break-all">
                        {variable.envValue || (
                          <span className="text-red-600 italic">[NO DEFINIDA]</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Valor Actual en Uso:
                      </div>
                      <div className="bg-white border rounded p-3 font-mono text-sm break-all">
                        {variable.isSensitive && variable.currentValue 
                          ? variable.currentValue 
                          : variable.currentValue || (
                            <span className="text-red-600 italic">[NO DEFINIDA]</span>
                          )}
                      </div>
                      {usingFallback && (
                        <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 border border-yellow-200 rounded p-2">
                          ⚠️ Usando valor fallback: <strong>{variable.fallback}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Warning */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-semibold text-yellow-900 mb-1">
                  ⚠️ IMPORTANTE: Página Temporal
                </div>
                <div className="text-sm text-yellow-800">
                  Esta página debe ser eliminada después de verificar las variables de entorno en producción.
                  Archivo: <code className="bg-yellow-100 px-1 rounded">src/pages/TempEnvDebugPage.tsx</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TempEnvDebugPage;

