"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingController = void 0;
const respond_1 = require("@/utils/respond");
const models_1 = require("@/models");
const validator_1 = require("@/utils/validator");
const httpError_1 = require("@/utils/httpError");
exports.TrainingController = {
    /* ── 课程 ── */
    async courseList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.TrainingCourse.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async courseCreate(req, res) {
        const c = await models_1.TrainingCourse.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: c.id }, '创建成功');
    },
    async courseUpdate(req, res) {
        await models_1.TrainingCourse.update((0, validator_1.sanitizeBody)(req.body), { where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '更新成功');
    },
    async courseDelete(req, res) {
        await models_1.TrainingCourse.destroy({ where: { id: (0, validator_1.parseIdStrict)(req.params.id) } });
        (0, respond_1.sendSuccess)(res, req, null, '删除成功');
    },
    /* ── 考试 ── */
    async examList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { count, rows } = await models_1.TrainingExam.findAndCountAll({
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async examById(req, res) {
        const exam = await models_1.TrainingExam.findByPk((0, validator_1.parseIdStrict)(req.params.id));
        if (!exam)
            throw new httpError_1.HttpError('试卷不存在', 404, 404);
        let questions = [];
        try {
            questions = exam.questions ? JSON.parse(exam.questions) : [];
        }
        catch { /* ignore */ }
        (0, respond_1.sendSuccess)(res, req, {
            id: exam.id,
            examName: exam.exam_name,
            duration: exam.duration,
            passScore: exam.pass_score,
            questionCount: questions.length,
            totalScore: questions.reduce((s, q) => s + (q.score || 0), 0),
            // 不返回正确答案
            questions: questions.map((q) => ({
                id: q.id,
                type: q.type,
                question: q.question,
                options: q.options,
                score: q.score,
            })),
        });
    },
    async examCreate(req, res) {
        const e = await models_1.TrainingExam.create((0, validator_1.sanitizeBody)(req.body));
        (0, respond_1.sendSuccess)(res, req, { id: e.id }, '创建成功');
    },
    /** 提交答案并计算成绩 */
    async examSubmit(req, res) {
        const examId = (0, validator_1.parseIdStrict)(req.params.id);
        const { examineeName, examineeId, answers, duration } = req.body || {};
        if (!examineeName)
            throw new httpError_1.HttpError('考生姓名不能为空', 400);
        if (!answers || typeof answers !== 'object')
            throw new httpError_1.HttpError('答案不能为空', 400);
        const exam = await models_1.TrainingExam.findByPk(examId);
        if (!exam)
            throw new httpError_1.HttpError('试卷不存在', 404, 404);
        let questions = [];
        try {
            questions = exam.questions ? JSON.parse(exam.questions) : [];
        }
        catch { /* ignore */ }
        let score = 0;
        let totalScore = 0;
        for (const q of questions) {
            totalScore += q.score || 0;
            const userAnswer = String(answers[q.id] || '').trim().toUpperCase();
            const correctAnswer = String(q.answer || '').trim().toUpperCase();
            if (userAnswer === correctAnswer)
                score += q.score || 0;
        }
        const passed = score >= (exam.pass_score || 60);
        const recordNo = `REC${Date.now()}${Math.floor(Math.random() * 100)}`;
        const certNo = passed ? `CERT${Date.now()}${Math.floor(Math.random() * 100)}` : null;
        const record = await models_1.TrainingRecord.create({
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
        });
        (0, respond_1.sendSuccess)(res, req, {
            recordId: record.id,
            recordNo,
            score,
            totalScore,
            passed,
            certNo,
            passScore: exam.pass_score || 60,
        }, passed ? '考核通过' : '考核未通过');
    },
    /* ── 成绩记录 ── */
    async recordList(req, res) {
        const { pageNum, pageSize } = (0, validator_1.sanitizePagination)(req);
        const { examId, examineeId, status } = req.query;
        const where = {};
        if (examId)
            where.exam_id = examId;
        if (examineeId)
            where.examinee_id = examineeId;
        if (status !== undefined && status !== '')
            where.status = status;
        const { count, rows } = await models_1.TrainingRecord.findAndCountAll({
            where,
            limit: +pageSize,
            offset: (+pageNum - 1) * +pageSize,
            order: [['created_at', 'DESC']],
        });
        (0, respond_1.sendPage)(res, req, rows, count, +pageNum, +pageSize);
    },
    async recordById(req, res) {
        const record = await models_1.TrainingRecord.findByPk((0, validator_1.parseIdStrict)(req.params.id));
        if (!record)
            throw new httpError_1.HttpError('成绩记录不存在', 404, 404);
        (0, respond_1.sendSuccess)(res, req, record);
    },
};
//# sourceMappingURL=training.controller.js.map