import type { CollectionConfig } from 'payload'
import { isAdmin } from '../workerkit/permissions'

export const Notes: CollectionConfig = {
  slug: 'notes',
  labels: { singular: '演示记录', plural: '演示记录' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'updatedAt'] },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => isAdmin(req.user),
    update: ({ req }) => isAdmin(req.user),
    delete: ({ req }) => isAdmin(req.user),
  },
  fields: [
    { name: 'title', label: '标题', type: 'text', required: true },
    { name: 'status', label: '状态', type: 'select', required: true, defaultValue: 'draft', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }] },
    { name: 'body', label: '正文', type: 'textarea' },
  ],
}
