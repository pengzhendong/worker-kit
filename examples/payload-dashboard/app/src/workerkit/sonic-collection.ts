import type { CollectionConfig } from '@sonicjs-cms/core'
export const sonicNotes = {
  name: 'workerkit_notes',
  displayName: '演示记录',
  slug: 'workerkit-notes',
  description: '与 Payload 使用相同字段，供界面和编辑流程对比；数据独立保存。',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', title: '标题', required: true, maxLength: 160 },
      body: { type: 'textarea', title: '正文' },
    },
    required: ['title'],
  },
  managed: true,
  isActive: true,
} satisfies CollectionConfig
