import { raw, api } from '../client';
import type { QueryParams } from '@/types/db';

export interface ExamSubmitBody {
  examineeName: string;
  examineeId?: number;
  answers: Record<string, string>;
  duration?: number;
}

export interface ExamSubmitResult {
  recordId: number;
  recordNo: string;
  score: number;
  totalScore: number;
  passed: boolean;
  certNo: string | null;
  passScore: number;
}

export const trainingService = {
  /* ── 课程 ── */
  courseList: (params?: QueryParams) => raw.get<unknown>('/training/courses', params),
  createCourse: (data: unknown) => raw.post<unknown>('/training/courses', data),
  updateCourse: (id: number, data: unknown) => raw.put<unknown>(`/training/courses/${id}`, data),
  deleteCourse: (id: number) => raw.delete<unknown>(`/training/courses/${id}`),

  /* ── 考试 ── */
  examList: (params?: QueryParams) => raw.get<unknown>('/training/exams', params),
  examById: (id: number) => api.get<unknown>(`/training/exams/${id}`),
  createExam: (data: unknown) => raw.post<unknown>('/training/exams', data),
  submitExam: (id: number, body: ExamSubmitBody) =>
    api.post<ExamSubmitResult>(`/training/exams/${id}/submit`, body),

  /* ── 成绩记录 ── */
  recordList: (params?: QueryParams) => raw.get<unknown>('/training/records', params),
  recordById: (id: number) => api.get<unknown>(`/training/records/${id}`),
};
