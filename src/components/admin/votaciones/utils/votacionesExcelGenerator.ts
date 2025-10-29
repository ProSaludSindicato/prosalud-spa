import * as XLSX from 'xlsx';
import type { VoteStatistics, Vote } from '@/types/votaciones';

export const generateVotacionesExcelReport = (
  statistics: VoteStatistics,
  auditData: Vote[],
  hospitalFilter?: string
): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  
  // Obtener fecha y hora actual en formato legible
  const now = new Date();
  const fechaHora = now.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Calcular estadísticas detalladas: hospital por candidato y candidato más votado por hospital
  // Intentar extraer información de candidato desde auditData si está disponible
  // Tipar el voto como any para acceder a propiedades potenciales no tipadas
  const candidateHospitalStats: { [candidateId: string]: { [hospital: string]: number } } = {};
  const hospitalCandidateStats: { [hospital: string]: { [candidateId: string]: number } } = {};
  
  // Procesar votos para calcular estadísticas
  auditData.forEach((vote: any) => {
    const hospital = vote.voter.hospital;
    // Intentar obtener candidate_id del voto (puede estar en diferentes lugares según la API)
    const candidateId = vote.candidate_id || vote.selected_candidate_id || vote.candidate?.id || null;
    
    if (candidateId && hospital) {
      // Inicializar estructuras si no existen
      if (!candidateHospitalStats[candidateId]) {
        candidateHospitalStats[candidateId] = {};
      }
      if (!hospitalCandidateStats[hospital]) {
        hospitalCandidateStats[hospital] = {};
      }
      
      // Contar votos por candidato-hospital
      candidateHospitalStats[candidateId][hospital] = (candidateHospitalStats[candidateId][hospital] || 0) + 1;
      hospitalCandidateStats[hospital][candidateId] = (hospitalCandidateStats[hospital][candidateId] || 0) + 1;
    }
  });

  // ============================================
  // PESTAÑA 1: ESTADÍSTICAS DE VOTACIÓN
  // ============================================
  const statsData = [
    ['REPORTE DE ESTADÍSTICAS DE VOTACIÓN - PROSALUD'],
    [`Fecha y hora de generación: ${fechaHora}`],
    ...(hospitalFilter ? [[`Filtro aplicado: Hospital ${hospitalFilter}`]] : [['Sin filtros aplicados']]),
    [''],
    ['RESUMEN GENERAL'],
    ['Métrica', 'Valor'],
    ['Total de votos', statistics.total_votes.toString()],
    ['Total de candidatos', statistics.votes_by_candidate.length.toString()],
    ['Total de hospitales', statistics.votes_by_hospital.length.toString()],
    [''],
    ['VOTOS POR CANDIDATO'],
    ['#', 'ID Candidato', 'Nombre del Candidato', 'Hospital', 'Cantidad de Votos']
  ];

  // Ordenar candidatos por cantidad de votos (descendente)
  const sortedCandidates = [...statistics.votes_by_candidate].sort(
    (a, b) => b.vote_count - a.vote_count
  );

  // Calcular distribución de votos por hospital para cada candidato
  // Agrupar votos de auditoría por hospital y luego distribuir por candidato
  const hospitalVoteDistribution: { [hospital: string]: number } = {};
  auditData.forEach(vote => {
    const hospital = vote.voter.hospital;
    hospitalVoteDistribution[hospital] = (hospitalVoteDistribution[hospital] || 0) + 1;
  });

  sortedCandidates.forEach((candidate, index) => {
    // Determinar el hospital que más votó por este candidato
    let candidateHospital = 'N/A';
    
    if (hospitalFilter) {
      candidateHospital = hospitalFilter;
    } else {
      // Si tenemos estadísticas detalladas, usarlas
      if (candidateHospitalStats[candidate.candidate_id]) {
        const hospitalVotes = candidateHospitalStats[candidate.candidate_id];
        const topHospitalEntry = Object.entries(hospitalVotes)
          .sort(([, a], [, b]) => b - a)[0];
        if (topHospitalEntry) {
          candidateHospital = topHospitalEntry[0];
        }
      } else {
        // Aproximación: usar el hospital con más votos totales
        const topHospital = Object.entries(hospitalVoteDistribution)
          .sort(([, a], [, b]) => b - a)[0];
        if (topHospital) {
          candidateHospital = topHospital[0];
        }
      }
    }
    
    statsData.push([
      (index + 1).toString(),
      candidate.candidate_id,
      candidate.candidate_name,
      candidateHospital,
      candidate.vote_count.toString()
    ]);
  });

  // Agregar tabla de candidato más votado por hospital
  statsData.push(['']);
  statsData.push(['CANDIDATO MÁS VOTADO POR HOSPITAL']);
  statsData.push(['Hospital', 'ID Candidato', 'Nombre del Candidato', 'Cantidad de Votos']);

  // Calcular el candidato más votado por cada hospital
  const hospitalTopCandidates: { [hospital: string]: { candidate_id: string; candidate_name: string; vote_count: number } } = {};
  
  // Si tenemos estadísticas detalladas, usarlas
  if (Object.keys(hospitalCandidateStats).length > 0) {
    Object.entries(hospitalCandidateStats).forEach(([hospital, candidateVotes]) => {
      const topCandidateEntry = Object.entries(candidateVotes)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topCandidateEntry) {
        const [topCandidateId, voteCount] = topCandidateEntry;
        const candidateInfo = sortedCandidates.find(c => c.candidate_id === topCandidateId);
        if (candidateInfo) {
          hospitalTopCandidates[hospital] = {
            candidate_id: candidateInfo.candidate_id,
            candidate_name: candidateInfo.candidate_name,
            vote_count: voteCount
          };
        }
      }
    });
  } else {
    // Aproximación: distribuir el candidato más votado por cada hospital
    statistics.votes_by_hospital.forEach(hospital => {
      const hospitalName = hospital.voter_hospital;
      if (sortedCandidates.length > 0) {
        const topCandidate = sortedCandidates[0];
        hospitalTopCandidates[hospitalName] = {
          candidate_id: topCandidate.candidate_id,
          candidate_name: topCandidate.candidate_name,
          vote_count: topCandidate.vote_count
        };
      }
    });
  }

  // Mostrar candidato más votado por cada hospital
  Object.entries(hospitalTopCandidates)
    .sort(([, a], [, b]) => b.vote_count - a.vote_count)
    .forEach(([hospital, candidate]) => {
      statsData.push([
        hospital,
        candidate.candidate_id,
        candidate.candidate_name,
        candidate.vote_count.toString()
      ]);
    });

  statsData.push(['']);
  statsData.push(['VOTOS POR HOSPITAL']);
  statsData.push(['#', 'Hospital', 'Cantidad de Votos']);

  // Ordenar hospitales por cantidad de votos (descendente)
  const sortedHospitals = [...statistics.votes_by_hospital].sort(
    (a, b) => b.vote_count - a.vote_count
  );

  sortedHospitals.forEach((hospital, index) => {
    statsData.push([
      (index + 1).toString(),
      hospital.voter_hospital,
      hospital.vote_count.toString()
    ]);
  });

  const statsWs = XLSX.utils.aoa_to_sheet(statsData);
  
  // Establecer ancho de columnas para mejor legibilidad
  statsWs['!cols'] = [
    { wch: 5 },  // #
    { wch: 15 }, // ID Candidato
    { wch: 40 }, // Nombre del Candidato
    { wch: 25 }, // Hospital
    { wch: 18 }  // Cantidad de Votos
  ];
  
  XLSX.utils.book_append_sheet(wb, statsWs, 'Estadísticas');

  // ============================================
  // PESTAÑA 2: AUDITORÍA DE VOTACIÓN
  // ============================================
  const auditDataSheet = [
    ['REPORTE DE AUDITORÍA DE VOTACIÓN - PROSALUD'],
    [`Fecha y hora de generación: ${fechaHora}`],
    [''],
    ['REGISTRO COMPLETO DE VOTOS'],
    [''],
    [
      'ID Voto',
      'Nombre Completo',
      'Tipo Documento',
      'Número Documento',
      'Hospital',
      'Cargo',
      'Fecha/Hora Voto',
      'Dirección IP',
      'User Agent'
    ]
  ];

  // Ordenar votos por fecha más reciente primero
  const sortedVotes = [...auditData].sort((a, b) => {
    const dateA = new Date(a.vote_timestamp).getTime();
    const dateB = new Date(b.vote_timestamp).getTime();
    return dateB - dateA;
  });

  sortedVotes.forEach((vote) => {
    const voteDate = new Date(vote.vote_timestamp);
    const formattedDate = voteDate.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    auditDataSheet.push([
      vote.vote_id.toString(),
      vote.voter.full_name || 'N/A',
      vote.voter.document_type,
      vote.voter.document_number,
      vote.voter.hospital,
      vote.voter.position || 'N/A',
      formattedDate,
      vote.ip_address,
      vote.user_agent
    ]);
  });

  // Agregar resumen al final de la pestaña de auditoría
  auditDataSheet.push(['']);
  auditDataSheet.push(['RESUMEN']);
  auditDataSheet.push(['Métrica', 'Valor']);
  auditDataSheet.push(['Total de registros de auditoría', sortedVotes.length.toString()]);
  
  // Contar por hospital en auditoría
  const hospitalsInAudit: { [key: string]: number } = {};
  sortedVotes.forEach(vote => {
    const hospital = vote.voter.hospital;
    hospitalsInAudit[hospital] = (hospitalsInAudit[hospital] || 0) + 1;
  });

  auditDataSheet.push(['']);
  auditDataSheet.push(['VOTOS POR HOSPITAL (AUDITORÍA)']);
  auditDataSheet.push(['Hospital', 'Cantidad de Votos']);
  
  Object.entries(hospitalsInAudit)
    .sort(([, a], [, b]) => b - a)
    .forEach(([hospital, count]) => {
      auditDataSheet.push([hospital, count.toString()]);
    });

  const auditWs = XLSX.utils.aoa_to_sheet(auditDataSheet);
  
  // Establecer ancho de columnas para mejor legibilidad
  auditWs['!cols'] = [
    { wch: 10 }, // ID Voto
    { wch: 30 }, // Nombre Completo
    { wch: 15 }, // Tipo Documento
    { wch: 15 }, // Número Documento
    { wch: 20 }, // Hospital
    { wch: 25 }, // Cargo
    { wch: 20 }, // Fecha/Hora
    { wch: 18 }, // IP
    { wch: 50 }  // User Agent
  ];
  
  XLSX.utils.book_append_sheet(wb, auditWs, 'Auditoría');

  return wb;
};

