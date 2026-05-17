import { raw } from '../client';

export const trainingService = {
  courseList: (params?: Record<string, unknown>) => raw.get<unknown>('/training/courses', params),
  createCourse: (data: unknown) => raw.post<unknown>('/training/courses', data),
  updateCourse: (id: number, data: unknown) => raw.put<unknown>(`/training/courses/${id}`, data),
  deleteCourse: (id: number) => raw.delete<unknown>(`/training/courses/${id}`),

  examList: (params?: Record<string, unknown>) => raw.get<unknown>('/training/exams', params),
  createExam: (data: unknown) => raw.post<unknown>('/training/exams', data),
};
