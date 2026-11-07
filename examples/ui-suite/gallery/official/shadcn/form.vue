<script setup lang="ts">
import { ref } from 'vue';
import { useForm } from 'vee-validate';

import { Button } from './registry/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './registry/form';
import { Input } from './registry/input';
import { Textarea } from './registry/textarea';

const submittedName = ref('');
const form = useForm({
  initialValues: { username: '', email: '', bio: '' },
  validationSchema: {
    username: (value: unknown) =>
      (typeof value === 'string' && value.trim().length >= 2) ||
      '请输入至少两个字符',
    email: (value: unknown) =>
      (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ||
      '请输入有效的邮箱',
    bio: (value: unknown) =>
      (typeof value === 'string' &&
        value.trim().length >= 10 &&
        value.length <= 160) ||
      '简介应在 10 到 160 个字符之间',
  },
});
const onSubmit = form.handleSubmit(
  (values) => {
    submittedName.value = values.username;
  },
  () => {
    submittedName.value = '';
  },
);
</script>

<template>
  <form class="w-full max-w-sm space-y-6" novalidate @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="username">
      <FormItem>
        <FormLabel>用户名</FormLabel>
        <FormControl>
          <Input type="text" placeholder="shadcn" v-bind="componentField" />
        </FormControl>
        <FormDescription> This is your public display name. </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>邮箱</FormLabel>
        <FormControl>
          <Input
            type="email"
            placeholder="your@email.com"
            v-bind="componentField"
          />
        </FormControl>
        <FormDescription>
          We'll never share your email with anyone else.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="bio">
      <FormItem>
        <FormLabel>简介</FormLabel>
        <FormControl>
          <Textarea
            placeholder="Tell us a little bit about yourself"
            class="resize-none"
            v-bind="componentField"
          />
        </FormControl>
        <FormDescription>
          You can @mention other users and organizations.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <Button type="submit" class="w-full"> 提交 </Button>
    <p v-if="submittedName" role="status">已通过校验：{{ submittedName }}</p>
  </form>
</template>
