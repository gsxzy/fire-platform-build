import type { Request, Response } from 'express';
import { sendSuccess, sendPage } from '@/utils/respond';
import { TrainingCourse, TrainingExam, TrainingRecord } from '@/models';
import { sanitizePagination, parseIdStrict, sanitizeBody } from '@/utils/validator';
import { HttpError } from '@/utils/httpError';

export const TrainingController = {
  /* ── 课程 ── */
  async courseList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await TrainingCourse.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async courseCreate(req: Request, res: Response) {
    const c = await TrainingCourse.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (c as any).id }, '创建成功');
  },

  async courseUpdate(req: Request, res: Response) {
    await TrainingCourse.update(sanitizeBody(req.body), { where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '更新成功');
  },

  async courseDelete(req: Request, res: Response) {
    await TrainingCourse.destroy({ where: { id: parseIdStrict(req.params.id) } });
    sendSuccess(res, req, null, '删除成功');
  },

  /* ── 考试 ── */
  async examList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { count, rows } = await TrainingExam.findAndCountAll({
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async examById(req: Request, res: Response) {
    const exam = await TrainingExam.findByPk(parseIdStrict(req.params.id)) as any;
    if (!exam) throw new HttpError('试卷不存在', 404, 404);
    let questions: any[] = [];
    try {
      questions = exam.questions ? JSON.parse(exam.questions) : [];
    } catch { /* ignore */ }
    sendSuccess(res, req, {
      id: exam.id,
      examName: exam.exam_name,
      duration: exam.duration,
      passScore: exam.pass_score,
      questionCount: questions.length,
      totalScore: questions.reduce((s: number, q: any) => s + (q.score || 0), 0),
      // 不返回正确答案
      questions: questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        score: q.score,
      })),
    });
  },

  async examCreate(req: Request, res: Response) {
    const e = await TrainingExam.create(sanitizeBody(req.body) as any);
    sendSuccess(res, req, { id: (e as any).id }, '创建成功');
  },

  /** 提交答案并计算成绩 */
  async examSubmit(req: Request, res: Response) {
    const examId = parseIdStrict(req.params.id);
    const { examineeName, examineeId, answers, duration } = req.body || {};
    if (!examineeName) throw new HttpError('考生姓名不能为空', 400);
    if (!answers || typeof answers !== 'object') throw new HttpError('答案不能为空', 400);

    const exam = await TrainingExam.findByPk(examId) as any;
    if (!exam) throw new HttpError('试卷不存在', 404, 404);

    let questions: any[] = [];
    try {
      questions = exam.questions ? JSON.parse(exam.questions) : [];
    } catch { /* ignore */ }

    let score = 0;
    let totalScore = 0;
    for (const q of questions) {
      totalScore += q.score || 0;
      const userAnswer = String(answers[q.id] || '').trim().toUpperCase();
      const correctAnswer = String(q.answer || '').trim().toUpperCase();
      if (userAnswer === correctAnswer) score += q.score || 0;
    }

    const passed = score >= (exam.pass_score || 60);
    const recordNo = `REC${Date.now()}${Math.floor(Math.random() * 100)}`;
    const certNo = passed ? `CERT${Date.now()}${Math.floor(Math.random() * 100)}` : null;

    const record = await TrainingRecord.create({
      record_no: recordNo,
      exam_id: examId,
      exam_name: exam.exam_name,
      examinee_name: examineeName,
      examinee_id: examineeId || null,
      answers: JSON.stringify(answers),
      score,
      total_score: totalScore,
      pass: passed,
      duration: duration || 0,
      cert_no: certNo,
      status: passed ? 1 : 0,
    } as any);

    sendSuccess(res, req, {
      recordId: (record as any).id,
      recordNo,
      score,
      totalScore,
      passed,
      certNo,
      passScore: exam.pass_score || 60,
    }, passed ? '考核通过' : '考核未通过');
  },

  /* ── 成绩记录 ── */
  async recordList(req: Request, res: Response) {
    const { pageNum, pageSize } = sanitizePagination(req);
    const { examId, examineeId, status } = req.query;
    const where: any = {};
    if (examId) where.exam_id = examId;
    if (examineeId) where.examinee_id = examineeId;
    if (status !== undefined && status !== '') where.status = status;
    const { count, rows } = await TrainingRecord.findAndCountAll({
      where,
      limit: +pageSize,
      offset: (+pageNum - 1) * +pageSize,
      order: [['created_at', 'DESC']],
    });
    sendPage(res, req, rows, count, +pageNum, +pageSize);
  },

  async recordById(req: Request, res: Response) {
    const record = await TrainingRecord.findByPk(parseIdStrict(req.params.id)) as any;
    if (!record) throw new HttpError('成绩记录不存在', 404, 404);
    sendSuccess(res, req, record);
  },
};
