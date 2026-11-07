import {
  Button,
  Card,
  Badge,
  Group,
  Modal,
  NumberInput,
  Select,
  Switch,
  Table,
  Textarea,
  TextInput,
} from '@mantine/core';
import { taskColumns, taskValue } from '../../ui-demo/component-fixtures';
import ComponentDemos from './ComponentDemos';
import type { ComponentProps } from 'react';

export default function MantineDemos(
  props: Omit<ComponentProps<typeof ComponentDemos>, 'controls'>,
) {
  return (
    <ComponentDemos
      {...props}
      controls={{
        card: (content) => (
          <Card withBorder padding="lg">
            {content}
          </Card>
        ),
        button: (label, onClick, disabled, primary) => (
          <Button
            variant={primary ? 'filled' : 'light'}
            onClick={onClick}
            disabled={disabled}
          >
            {label}
          </Button>
        ),
        input: (label, value, change) => (
          <TextInput
            label={label}
            value={value}
            onChange={(event) => change(event.currentTarget.value)}
          />
        ),
        description: (value, change) => (
          <Textarea
            label="说明"
            minRows={2}
            value={value}
            onChange={(event) => change(event.currentTarget.value)}
          />
        ),
        select: (label, value, options, change) => (
          <Select
            label={label}
            data={options}
            value={value}
            allowDeselect={false}
            onChange={(zone) => {
              if (zone) change(zone);
            }}
          />
        ),
        retention: (value, change) => (
          <NumberInput
            label="日志保留天数"
            value={value ?? ''}
            onChange={(next) => change(next === '' ? null : Number(next))}
          />
        ),
        toggle: (label, value, change) => (
          <Switch
            label={label}
            checked={value}
            onChange={(event) => change(event.currentTarget.checked)}
          />
        ),
        table: (rows, run, toggle) => (
          <Table striped miw={760}>
            <Table.Thead>
              <Table.Tr>
                {taskColumns.map(({ key, title }) => (
                  <Table.Th key={key}>{title}</Table.Th>
                ))}
                <Table.Th>启用</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.id}>
                  {taskColumns.map(({ key }) => (
                    <Table.Td key={key}>{taskValue(row, key)}</Table.Td>
                  ))}
                  <Table.Td>
                    <Switch
                      checked={row.enabled}
                      aria-label={'启用' + row.name}
                      onChange={(event) =>
                        toggle(row, event.currentTarget.checked)
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Button
                      variant="subtle"
                      aria-label={'运行' + row.name}
                      onClick={() => run(row)}
                    >
                      运行
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ),
        statuses: () => (
          <Group className="demo-statuses">
            <Badge color="green">成功</Badge>
            <Badge color="yellow">警告</Badge>
            <Badge color="red">错误</Badge>
          </Group>
        ),
        dialog: (open, confirming, close, complete) => (
          <Modal
            opened={open}
            onClose={close}
            title={confirming ? '确认演示操作' : '示例弹窗'}
          >
            <p>确认后显示演示结果。</p>
            <Group justify="flex-end">
              <Button variant="light" onClick={close}>
                取消
              </Button>
              <Button onClick={complete}>
                {confirming ? '确认操作' : '完成操作'}
              </Button>
            </Group>
          </Modal>
        ),
      }}
    />
  );
}
