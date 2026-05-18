import { Router } from 'express';
import { KnowledgeController } from '@/controllers/knowledge.controller';
import { handleController } from '@/utils/handleController';
import { requirePermission } from '@/middleware/permission';
import { upload } from '@/middleware/upload';

const router = Router();
const h = (name: keyof typeof KnowledgeController) =>
  handleController(`Knowledge.${String(name)}`, KnowledgeController[name]);

const view = requirePermission('knowledge:view');
const manage = requirePermission('knowledge:manage');

router.get('/', view, h('list'));
router.get('/:id', view, h('byId'));
router.post('/', manage, h('create'));
router.put('/:id', manage, h('update'));
router.delete('/:id', manage, h('delete'));
router.get('/categories', view, h('categories'));
router.get('/categories/list', view, h('categoryList'));
router.post('/categories', manage, h('categoryCreate'));
router.put('/categories/:id', manage, h('categoryUpdate'));
router.delete('/categories/:id', manage, h('categoryDelete'));
router.post('/upload', manage, upload.single('file'), h('upload'));

export default router;
