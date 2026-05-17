import { Router } from 'express';
import { KnowledgeController } from '@/controllers/knowledge.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';

const router = Router();
const h = (name: keyof typeof KnowledgeController) =>
  handleController(`Knowledge.${String(name)}`, KnowledgeController[name]);

const view = requirePermission('knowledge:view');
const manage = requirePermission('knowledge:manage');

router.get('/', view, h('list'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));
router.get('/categories', view, h('categories'));

export default router;
