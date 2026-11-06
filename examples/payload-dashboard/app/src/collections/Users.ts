import type { CollectionConfig } from 'payload'
import { isAdmin } from '../workerkit/permissions'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'username' },
  auth: { loginWithUsername: { allowEmailLogin: true, requireEmail: true, requireUsername: false } },
  access: {
    create: ({ req }) => isAdmin(req.user),
    read: ({ req }) => isAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false,
    update: ({ req }) => isAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false,
    delete: ({ req }) => isAdmin(req.user),
  },
  hooks: {
    beforeChange: [async ({ data, operation, req, originalDoc }) => {
      if (operation === 'create') {
        // Payload's first-register operation is allowed only while the collection is empty.
        const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
        if (totalDocs === 0) data.role = 'admin'
        else if (!isAdmin(req.user)) data.role = 'viewer'
      } else if (!isAdmin(req.user)) data.role = originalDoc.role
      return data
    }],
  },
  fields: [{
    name: 'role', label: '角色', type: 'select', required: true, defaultValue: 'viewer', saveToJWT: false,
    options: [{ label: '管理员', value: 'admin' }, { label: '只读', value: 'viewer' }],
    access: { create: ({ req }) => isAdmin(req.user), update: ({ req }) => isAdmin(req.user) },
  }],
  versions: false,
}
