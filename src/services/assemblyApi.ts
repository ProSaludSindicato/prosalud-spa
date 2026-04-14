import type { AxiosRequestConfig } from "axios";
import api, { authenticatedApi } from "@/services/api";
import type {
  Assembly,
  AssemblyDelegateFileVersion,
  AssemblyDelegatesFileInfo,
  AssemblyQuestion,
  AssemblyStats,
  AssemblyVote,
  AttendanceRecord,
  MajorityType,
  PaginatedResponse,
  QuorumConfig,
} from "@/types/assembly";

const PREFIX = "/api/assembly";

const removeUndefined = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null),
  );

type RemoteOption = {
  id: string;
  text?: string;
  description?: string | null;
  [key: string]: unknown;
};

type RemoteQuestion = {
  id: string;
  title?: string;
  description?: string | null;
  helpText?: string | null;
  help_text?: string | null;
  options?: RemoteOption[];
  type?: AssemblyQuestion["type"];
  majorityType?: AssemblyQuestion["majorityType"];
  majority_type?: AssemblyQuestion["majorityType"];
  status?: AssemblyQuestion["status"];
  timeLimit?: number;
  time_limit?: number;
  quorumRequired?: boolean;
  quorum_required?: boolean;
  allowChangeVote?: boolean;
  allow_change_vote?: boolean;
  order?: number;
  openedAt?: string | null;
  opened_at?: string | null;
  closedAt?: string | null;
  closed_at?: string | null;
  votesCount?: number;
  votes_count?: number;
  resultsVisible?: boolean;
  results_visible?: boolean;
  [key: string]: unknown;
};

type RemoteVote = {
  id: string;
  questionId?: string;
  question_id?: string;
  voterId?: string;
  voter_id?: string;
  voterName?: string;
  voter_name?: string;
  selectedOptions?: string[] | string;
  selected_options?: string[] | string;
  votedAt?: string;
  voted_at?: string;
  [key: string]: unknown;
};

type RemoteQuorum = {
  totalDelegates?: number;
  total_delegates?: number;
  presentDelegates?: number;
  present_delegates?: number;
  requiredPercentage?: number;
  required_percentage?: number;
  verified?: boolean;
  [key: string]: unknown;
};

type RemoteAssembly = {
  id: string;
  name?: string;
  description?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
  isActive?: boolean;
  is_active?: boolean;
  allowsReactivation?: boolean;
  allows_reactivation?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  questionsCount?: number;
  questions_count?: number;
  attendancesCount?: number;
  attendances_count?: number;
  quorumConfigsCount?: number;
  quorum_configs_count?: number;
  [key: string]: unknown;
};

type RemoteOptionResult = {
  optionId?: string;
  option_id?: string;
  optionText?: string;
  option_text?: string;
  votes?: number;
  percentage?: number;
  [key: string]: unknown;
};

type RemoteStats = {
  questionId?: string;
  question_id?: string;
  totalVotes?: number;
  total_votes?: number;
  optionResults?: RemoteOptionResult[];
  option_results?: RemoteOptionResult[];
  majorityAchieved?: boolean;
  majority_achieved?: boolean;
  majorityType?: AssemblyStats["majorityType"];
  majority_type?: AssemblyStats["majorityType"];
  [key: string]: unknown;
};

type QuestionsResponse = RemoteQuestion[] | { data?: RemoteQuestion[]; questions?: RemoteQuestion[] };
type QuestionResponse = RemoteQuestion | { data?: RemoteQuestion };
type VoteResponse = RemoteVote | { data?: RemoteVote } | null;
type QuorumResponse = RemoteQuorum | { data?: RemoteQuorum };
type StatsResponse = RemoteStats | { data?: RemoteStats };

const normalizeQuestion = (question: RemoteQuestion): AssemblyQuestion => ({
  id: question.id,
  title: question.title ?? "",
  description: question.description ?? null,
  helpText: question.helpText ?? question.help_text ?? null,
  options: Array.isArray(question.options)
    ? question.options.map((option) => ({
        id: option.id,
        text: option.text ?? "",
        description: option.description ?? null,
      }))
    : [],
  type: question.type ?? "SINGLE",
  majorityType: question.majorityType ?? question.majority_type ?? "SIMPLE",
  status: question.status ?? "PENDING",
  timeLimit: question.timeLimit ?? question.time_limit ?? 60,
  quorumRequired: question.quorumRequired ?? question.quorum_required ?? false,
  allowChangeVote: question.allowChangeVote ?? question.allow_change_vote ?? false,
  order: question.order ?? 0,
  openedAt: question.openedAt ?? question.opened_at ?? undefined,
  closedAt: question.closedAt ?? question.closed_at ?? undefined,
  votesCount: question.votesCount ?? question.votes_count ?? 0,
  resultsVisible: question.resultsVisible ?? question.results_visible ?? false,
});

const normalizeVote = (vote: RemoteVote): AssemblyVote => {
  const rawSelected = vote.selectedOptions ?? vote.selected_options ?? [];
  const selectedOptions = Array.isArray(rawSelected)
    ? rawSelected
    : rawSelected
      ? [rawSelected]
      : [];

  return {
    id: vote.id,
    questionId: vote.questionId ?? vote.question_id ?? "",
    voterId: vote.voterId ?? vote.voter_id ?? "",
    voterName: vote.voterName ?? vote.voter_name ?? "",
    selectedOptions,
    votedAt: vote.votedAt ?? vote.voted_at ?? new Date().toISOString(),
  };
};

const normalizeQuorum = (payload: RemoteQuorum): QuorumConfig => ({
  totalDelegates: payload.totalDelegates ?? payload.total_delegates ?? 0,
  presentDelegates: payload.presentDelegates ?? payload.present_delegates ?? 0,
  requiredPercentage: payload.requiredPercentage ?? payload.required_percentage ?? 50,
  verified: payload.verified ?? false,
});

const normalizeStats = (payload: RemoteStats): AssemblyStats => {
  const optionResultsRaw =
    (payload.optionResults ?? payload.option_results ?? []) as RemoteOptionResult[];

  return {
    questionId: payload.questionId ?? payload.question_id ?? "",
    totalVotes: payload.totalVotes ?? payload.total_votes ?? 0,
    optionResults: optionResultsRaw.map((result) => ({
      optionId: result.optionId ?? result.option_id ?? "",
      optionText: result.optionText ?? result.option_text ?? "",
      votes: result.votes ?? 0,
      percentage: result.percentage ?? 0,
    })),
    majorityAchieved: payload.majorityAchieved ?? payload.majority_achieved ?? false,
    majorityType: payload.majorityType ?? payload.majority_type ?? "SIMPLE",
  };
};

const normalizeAssembly = (payload: RemoteAssembly): Assembly => {
  const df = payload.delegatesFile ?? payload.delegates_file;
  const delegatesFile =
    df && typeof df === "object"
      ? {
          hasFile: Boolean((df as { hasFile?: boolean }).hasFile ?? (df as { has_file?: boolean }).has_file),
          disk: (df as { disk?: string | null }).disk ?? null,
        }
      : undefined;

  return {
    id: payload.id,
    name: payload.name ?? "",
    description: payload.description ?? null,
    startDate: payload.startDate ?? payload.start_date ?? null,
    endDate: payload.endDate ?? payload.end_date ?? null,
    isActive: payload.isActive ?? payload.is_active ?? false,
    allowsReactivation: payload.allowsReactivation ?? payload.allows_reactivation,
    createdAt: payload.createdAt ?? payload.created_at ?? new Date().toISOString(),
    updatedAt: payload.updatedAt ?? payload.updated_at ?? new Date().toISOString(),
    questionsCount: payload.questionsCount ?? payload.questions_count,
    attendancesCount: payload.attendancesCount ?? payload.attendances_count,
    quorumConfigsCount: payload.quorumConfigsCount ?? payload.quorum_configs_count,
    delegatesFile,
  };
};

const normalizeDelegateFileVersion = (raw: Record<string, unknown>): AssemblyDelegateFileVersion => {
  const uploaded = raw.uploadedBy ?? raw.uploaded_by;
  const uploader =
    uploaded && typeof uploaded === "object"
      ? {
          id: Number((uploaded as { id?: number }).id),
          name: String((uploaded as { name?: string }).name ?? ""),
          email: String((uploaded as { email?: string }).email ?? ""),
        }
      : null;

  return {
    id: Number(raw.id),
    storagePath: String(raw.storagePath ?? raw.storage_path ?? ""),
    disk: String(raw.disk ?? ""),
    originalFilename: (raw.originalFilename ?? raw.original_filename) as string | null,
    rowCount: Number(raw.rowCount ?? raw.row_count ?? 0),
    uploadedBy: uploader,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
};

const serializeQuestionPayload = (payload: Partial<AssemblyQuestion>) =>
  removeUndefined({
    title: payload.title,
    description: payload.description,
    helpText: payload.helpText,
    type: payload.type,
    majorityType: payload.majorityType,
    timeLimit: payload.timeLimit,
    quorumRequired: payload.quorumRequired,
    allowChangeVote: payload.allowChangeVote,
    order: payload.order,
    resultsVisible: payload.resultsVisible,
    options: payload.options?.map((option) => ({
      id: option.id,
      text: option.text,
      description: option.description,
    })),
  });

export const assemblyApi = {
  getCurrentAssembly: async (): Promise<Assembly | null> => {
    try {
      const { status, data } = await api.get<{ success?: boolean; data?: RemoteAssembly; message?: string }>(
        `${PREFIX}/current`,
        { validateStatus: (s) => s === 404 || (s >= 200 && s < 300) },
      );
      if (status === 404) {
        return null;
      }
      if (!data || (data as { success?: boolean }).success === false) {
        return null;
      }
      const assembly = (data as { data?: RemoteAssembly }).data ?? (data as unknown as RemoteAssembly);
      if (!assembly || typeof assembly !== "object" || !("id" in assembly)) {
        return null;
      }
      return normalizeAssembly(assembly as RemoteAssembly);
    } catch {
      return null;
    }
  },

  getAssemblies: async (params?: { active?: boolean }): Promise<Assembly[]> => {
    const query = new URLSearchParams();
    if (params?.active !== undefined) {
      query.append("active", String(params.active));
    }
    const qs = query.toString();
    const path = `${PREFIX}/assemblies${qs ? `?${qs}` : ""}`;
    const { data } = await authenticatedApi.get<{ success?: boolean; data?: RemoteAssembly[] } | RemoteAssembly[]>(
      path,
    );
    const assemblies = Array.isArray(data)
      ? data
      : (data as { data?: RemoteAssembly[] }).data ?? [];
    return assemblies.map(normalizeAssembly);
  },

  getAssembly: async (id: string): Promise<Assembly> => {
    const { data } = await authenticatedApi.get<{ success?: boolean; data?: RemoteAssembly }>(
      `${PREFIX}/assemblies/${id}`,
    );
    const assembly = (data as { data?: RemoteAssembly }).data ?? (data as unknown as RemoteAssembly);
    return normalizeAssembly(assembly as RemoteAssembly);
  },

  createAssembly: async (payload: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    activate?: boolean;
  }): Promise<Assembly> => {
    const body = removeUndefined({
      name: payload.name,
      description: payload.description,
      startDate: payload.startDate,
      endDate: payload.endDate,
      activate: payload.activate,
    });
    const { data } = await authenticatedApi.post<{ success?: boolean; data?: RemoteAssembly }>(
      `${PREFIX}/assemblies`,
      body,
    );
    const assembly = (data as { data?: RemoteAssembly }).data ?? (data as unknown as RemoteAssembly);
    return normalizeAssembly(assembly as RemoteAssembly);
  },

  updateAssembly: async (
    id: string,
    payload: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ): Promise<Assembly> => {
    const body = removeUndefined({
      name: payload.name,
      description: payload.description,
      startDate: payload.startDate,
      endDate: payload.endDate,
      isActive: payload.isActive,
    });
    const { data } = await authenticatedApi.put<{ success?: boolean; data?: RemoteAssembly }>(
      `${PREFIX}/assemblies/${id}`,
      body,
    );
    const assembly = (data as { data?: RemoteAssembly }).data ?? (data as unknown as RemoteAssembly);
    return normalizeAssembly(assembly as RemoteAssembly);
  },

  deactivateAssembly: async (id: string): Promise<Assembly> => {
    const { data } = await authenticatedApi.post<{ success?: boolean; data?: RemoteAssembly; message?: string }>(
      `${PREFIX}/assemblies/${id}/deactivate`,
    );
    const assembly = (data as { data?: RemoteAssembly }).data ?? (data as unknown as RemoteAssembly);
    return normalizeAssembly(assembly as RemoteAssembly);
  },

  getQuestions: async (params?: { assembly_id?: string }): Promise<AssemblyQuestion[]> => {
    const query = new URLSearchParams();
    if (params?.assembly_id) {
      query.append("assembly_id", params.assembly_id);
    }
    const qs = query.toString();
    const path = `${PREFIX}/questions${qs ? `?${qs}` : ""}`;
    const { data } = await api.get<QuestionsResponse>(path);
    const questions = Array.isArray(data) ? data : data?.data ?? data?.questions ?? [];
    return questions.map(normalizeQuestion);
  },

  getQuestion: async (id: string): Promise<AssemblyQuestion> => {
    const { data } = await api.get<QuestionResponse>(`${PREFIX}/questions/${id}`);
    const question = Array.isArray(data) ? data[0] : (data as { data?: RemoteQuestion }).data ?? data;
    return normalizeQuestion(question as RemoteQuestion);
  },

  startLiveQuestion: async (
    payload: {
      title?: string;
      timeLimit?: number;
      majorityType?: MajorityType;
      quorumRequired?: boolean;
      allowChangeVote?: boolean;
      resultsVisible?: boolean;
    } = {},
  ): Promise<AssemblyQuestion> => {
    const { data } = await authenticatedApi.post<{ success?: boolean; data?: RemoteQuestion }>(
      `${PREFIX}/live-question/start`,
      payload,
    );
    const question = Array.isArray(data) ? data[0] : (data as { data?: RemoteQuestion }).data ?? data;
    return normalizeQuestion(question as RemoteQuestion);
  },

  closeLiveQuestion: async (): Promise<AssemblyQuestion> => {
    const { data } = await authenticatedApi.post<{ success?: boolean; data?: RemoteQuestion }>(
      `${PREFIX}/live-question/close`,
    );
    const question = Array.isArray(data) ? data[0] : (data as { data?: RemoteQuestion }).data ?? data;
    return normalizeQuestion(question as RemoteQuestion);
  },

  updateQuestion: async (id: string, updates: Partial<AssemblyQuestion>): Promise<void> => {
    const body = serializeQuestionPayload(updates);
    await authenticatedApi.put(`${PREFIX}/questions/${id}`, body);
  },

  submitVote: async (
    questionId: string,
    voterId: string,
    voterName: string,
    selectedOptions: string[],
  ): Promise<void> => {
    await api.post(`${PREFIX}/questions/${questionId}/votes`, {
      voterId,
      voterName,
      selectedOptions,
    });
  },

  getUserVote: async (questionId: string, voterId: string): Promise<AssemblyVote | null> => {
    try {
      const { data, status } = await api.get<VoteResponse>(
        `${PREFIX}/questions/${questionId}/votes/me`,
        {
          params: { voterId },
          validateStatus: (s) => s === 404 || (s >= 200 && s < 300),
        } as AxiosRequestConfig,
      );
      if (status === 404 || data === null || data === undefined) {
        return null;
      }
      const vote = Array.isArray(data) ? data[0] : (data as { data?: RemoteVote }).data ?? data;
      return normalizeVote(vote as RemoteVote);
    } catch {
      return null;
    }
  },

  getQuestionResults: async (questionId: string): Promise<AssemblyStats> => {
    const { data } = await api.get<StatsResponse>(`${PREFIX}/questions/${questionId}/results`);
    const stats = Array.isArray(data) ? data[0] : (data as { data?: RemoteStats }).data ?? data;
    return normalizeStats(stats as RemoteStats);
  },

  getQuorum: async (): Promise<QuorumConfig> => {
    const { data } = await api.get<QuorumResponse>(`${PREFIX}/quorum`);
    const quorum = Array.isArray(data) ? data[0] : (data as { data?: RemoteQuorum }).data ?? data;
    return normalizeQuorum(quorum as RemoteQuorum);
  },

  updateQuorum: async (config: Partial<QuorumConfig>): Promise<QuorumConfig> => {
    const body = removeUndefined({
      totalDelegates: config.totalDelegates,
      presentDelegates: config.presentDelegates,
      requiredPercentage: config.requiredPercentage,
    });
    const { data } = await authenticatedApi.put<QuorumResponse>(`${PREFIX}/quorum`, body);
    const quorum = Array.isArray(data) ? data[0] : (data as { data?: RemoteQuorum }).data ?? data;
    return normalizeQuorum(quorum as RemoteQuorum);
  },

  verifyQuorum: async (): Promise<boolean> => {
    const { data } = await authenticatedApi.post<{ verified?: boolean; data?: { verified?: boolean } }>(
      `${PREFIX}/quorum/verify`,
    );
    return data?.verified ?? data?.data?.verified ?? false;
  },

  resetMockData: async (): Promise<void> => {
    console.warn("resetMockData ya no está disponible con la API real.");
  },

  getAttendance: async (
    params: {
      page?: number;
      perPage?: number;
      document?: string;
      from?: string;
      to?: string;
      assembly_id?: string;
    } = {},
  ): Promise<PaginatedResponse<AttendanceRecord>> => {
    const query = new URLSearchParams();
    if (params.page) {
      query.append("page", String(params.page));
    }
    if (params.perPage) {
      query.append("perPage", String(params.perPage));
    }
    if (params.document) {
      query.append("document", params.document);
    }
    if (params.from) {
      query.append("from", params.from);
    }
    if (params.to) {
      query.append("to", params.to);
    }
    if (params.assembly_id) {
      query.append("assembly_id", params.assembly_id);
    }
    const qs = query.toString();
    const path = `${PREFIX}/attendance${qs ? `?${qs}` : ""}`;
    const { data } = await authenticatedApi.get<PaginatedResponse<AttendanceRecord>>(path);
    return data;
  },

  downloadReport: async (assemblyId?: string): Promise<void> => {
    const queryParams = assemblyId ? { params: { assembly_id: assemblyId } } : {};
    const response = await authenticatedApi.get(`${PREFIX}/report/download`, {
      ...queryParams,
      responseType: "blob",
      headers: {
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    let filename = "reporte_asamblea.xlsx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    } else {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "-");
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
      filename = `reporte_asamblea_${dateStr}_${timeStr}.xlsx`;
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  deleteAttendance: async (id: number): Promise<void> => {
    await authenticatedApi.delete(`${PREFIX}/attendance/${id}`);
  },

  getDelegatesFileInfo: async (assemblyId: string): Promise<AssemblyDelegatesFileInfo> => {
    const { data } = await authenticatedApi.get<{
      success?: boolean;
      data?: Record<string, unknown>;
    }>(`${PREFIX}/assemblies/${assemblyId}/delegates-file`);
    const d = (data as { data?: Record<string, unknown> }).data ?? {};
    const latestRaw = d.latestVersion ?? d.latest_version;
    const latest =
      latestRaw && typeof latestRaw === "object"
        ? normalizeDelegateFileVersion(latestRaw as Record<string, unknown>)
        : null;

    return {
      hasFile: Boolean(d.hasFile ?? d.has_file),
      storagePath: (d.storagePath ?? d.storage_path) as string | null,
      disk: (d.disk as string | null) ?? null,
      latestVersion: latest,
    };
  },

  getDelegatesFileVersions: async (assemblyId: string): Promise<AssemblyDelegateFileVersion[]> => {
    const { data } = await authenticatedApi.get<{
      success?: boolean;
      data?: Record<string, unknown>[];
    }>(`${PREFIX}/assemblies/${assemblyId}/delegates-file/versions`);
    const rows = (data as { data?: Record<string, unknown>[] }).data ?? [];
    return rows.map((row) => normalizeDelegateFileVersion(row));
  },

  uploadDelegatesFile: async (
    assemblyId: string,
    file: File,
  ): Promise<{ rowCount: number; version: AssemblyDelegateFileVersion }> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await authenticatedApi.post<{
      success?: boolean;
      data?: { rowCount?: number; row_count?: number; version?: Record<string, unknown> };
    }>(`${PREFIX}/assemblies/${assemblyId}/delegates-file`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const payload = (data as { data?: { rowCount?: number; row_count?: number; version?: Record<string, unknown> } })
      .data;
    const versionRaw = payload?.version;
    if (!versionRaw || typeof versionRaw !== "object") {
      throw new Error("Respuesta inválida al subir archivo de delegados.");
    }
    return {
      rowCount: Number(payload?.rowCount ?? payload?.row_count ?? 0),
      version: normalizeDelegateFileVersion(versionRaw as Record<string, unknown>),
    };
  },

  downloadDelegatesFile: async (assemblyId: string, versionId?: number): Promise<void> => {
    const response = await authenticatedApi.get(`${PREFIX}/assemblies/${assemblyId}/delegates-file/download`, {
      params: versionId !== undefined ? { version: versionId } : {},
      responseType: "blob",
      headers: { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    });

    const contentDisposition = response.headers["content-disposition"] as string | undefined;
    let filename = `delegados-asamblea-${assemblyId}.xlsx`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
